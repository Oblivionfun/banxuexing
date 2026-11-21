import "server-only";
import { and, gte, isNull, lte, ne } from "drizzle-orm";
import { STUDENT_ID, getDb } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { listAvailability, listSubjects, logActivity } from "@/lib/queries";
import {
  proposeSchedule,
  type ProposedSlot,
  type SubjectRequest,
  type UnmetRequest,
} from "@/lib/scheduler";
import { addDays, isDateString, toMinutes, weekStart } from "@/lib/time";

export type ScheduleProposal = {
  weekStart: string;
  slots: (ProposedSlot & { subjectName: string; hue: number })[];
  unmet: UnmetRequest[];
  error?: string;
};

export type ScheduleRequest = { subjectId: number; sessions: number };

export function proposeScheduleForWeek(anchor: string, requests?: ScheduleRequest[]): ScheduleProposal {
  if (!isDateString(anchor)) {
    return { weekStart: anchor, slots: [], unmet: [], error: "请选择要排的那一周" };
  }
  const start = weekStart(anchor);
  const windows = listAvailability();
  const subjects = listSubjects();
  const studentWindows = windows.filter((row) => row.ownerType === "student");
  if (studentWindows.length === 0) {
    return { weekStart: start, slots: [], unmet: [], error: "请先填写学生每周可以上课的时间" };
  }

  const requestedIds = requests ? new Set(requests.map((request) => request.subjectId)) : null;
  const subjectRequests: SubjectRequest[] = subjects
    .filter((subject) => (requestedIds ? requestedIds.has(subject.id) : true))
    .map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      sessions: requests?.find((request) => request.subjectId === subject.id)?.sessions ?? subject.weeklyLessons,
      minutes: subject.lessonMinutes,
      teacherWindows: windows.filter((row) => row.ownerType === "subject" && row.subjectId === subject.id),
    }));

  const busy = getDb()
    .select({ date: lessons.date, startTime: lessons.startTime, endTime: lessons.endTime })
    .from(lessons)
    .where(
      and(
        isNull(lessons.deletedAt),
        ne(lessons.status, "cancelled"),
        gte(lessons.date, start),
        lte(lessons.date, addDays(start, 6)),
      ),
    )
    .all();

  const result = proposeSchedule({ weekStart: start, studentWindows, busy, subjects: subjectRequests });
  return {
    weekStart: start,
    unmet: result.unmet,
    slots: result.slots.map((slot) => {
      const subject = subjects.find((item) => item.id === slot.subjectId);
      return { ...slot, subjectName: subject?.name ?? "", hue: subject?.hue ?? 250 };
    }),
  };
}

export type SkippedSlot = ProposedSlot & { reason: "unknown_subject" | "conflict" | "duplicate" };

export function applyScheduleSlots(
  slots: ProposedSlot[],
  { actor = "工作人员", allowOverlap = false }: { actor?: string; allowOverlap?: boolean } = {},
): { created: number; ids: number[]; skipped: SkippedSlot[] } {
  if (slots.length === 0 || slots.length > 80) throw new Error("没有可以加入的课程");
  const subjectIds = new Set(listSubjects().map((subject) => subject.id));
  const db = getDb();
  const ids: number[] = [];
  const skipped: SkippedSlot[] = [];

  db.transaction((tx) => {
    for (const slot of slots) {
      if (!subjectIds.has(slot.subjectId)) {
        skipped.push({ ...slot, reason: "unknown_subject" });
        continue;
      }
      const sameDay = tx
        .select({
          subjectId: lessons.subjectId,
          startTime: lessons.startTime,
          endTime: lessons.endTime,
        })
        .from(lessons)
        .where(
          and(
            isNull(lessons.deletedAt),
            ne(lessons.status, "cancelled"),
            gte(lessons.date, slot.date),
            lte(lessons.date, slot.date),
          ),
        )
        .all();
      if (
        sameDay.some(
          (row) => row.subjectId === slot.subjectId && row.startTime === slot.startTime,
        )
      ) {
        skipped.push({ ...slot, reason: "duplicate" });
        continue;
      }
      const clash = sameDay.some(
        (row) =>
          toMinutes(row.startTime) < toMinutes(slot.endTime) &&
          toMinutes(slot.startTime) < toMinutes(row.endTime),
      );
      if (clash && !allowOverlap) {
        skipped.push({ ...slot, reason: "conflict" });
        continue;
      }
      const inserted = tx
        .insert(lessons)
        .values({ studentId: STUDENT_ID, ...slot, status: "planned" })
        .returning({ id: lessons.id })
        .get();
      ids.push(inserted.id);
    }
  });

  logActivity({
    action: "schedule.apply",
    entityType: "lesson",
    entityId: slots[0].date,
    summary: `排课助手：加入 ${ids.length} 节课${skipped.length ? `，${skipped.length} 节跳过` : ""}`,
    actor,
  });
  return { created: ids.length, ids, skipped };
}
