"use server";

import { and, gte, isNull, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addWindow, removeWindow, type WindowResult } from "@/lib/availability";
import { STUDENT_ID, getDb } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { listAvailability, listSubjects, logActivity } from "@/lib/queries";
import { proposeSchedule, type ProposedSlot, type UnmetRequest } from "@/lib/scheduler";
import { addDays, isDateString, isTimeString, toMinutes, weekStart } from "@/lib/time";

export async function addWindowAction(
  subjectId: number | null,
  _prev: WindowResult,
  formData: FormData,
): Promise<WindowResult> {
  await requireAdmin();
  const result = addWindow(subjectId, formData);
  if (result.ok) revalidatePath("/admin/scheduling");
  return result;
}

export async function removeWindowAction(id: number): Promise<void> {
  await requireAdmin();
  removeWindow(id);
  revalidatePath("/admin/scheduling");
}

export type ScheduleProposal = {
  weekStart: string;
  slots: (ProposedSlot & { subjectName: string; hue: number })[];
  unmet: UnmetRequest[];
  error?: string;
};

export async function generateScheduleAction(anchor: string): Promise<ScheduleProposal> {
  await requireAdmin();
  if (!isDateString(anchor)) return { weekStart: anchor, slots: [], unmet: [], error: "请选择要排的那一周" };
  const start = weekStart(anchor);
  const windows = listAvailability();
  const subjects = listSubjects();
  const studentWindows = windows.filter((row) => row.ownerType === "student");
  if (studentWindows.length === 0) {
    return { weekStart: start, slots: [], unmet: [], error: "请先填写学生每周可以上课的时间" };
  }

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

  const result = proposeSchedule({
    weekStart: start,
    studentWindows,
    busy,
    subjects: subjects.map((subject) => ({
      subjectId: subject.id,
      name: subject.name,
      sessions: subject.weeklyLessons,
      minutes: subject.lessonMinutes,
      teacherWindows: windows.filter((row) => row.ownerType === "subject" && row.subjectId === subject.id),
    })),
  });

  return {
    weekStart: start,
    unmet: result.unmet,
    slots: result.slots.map((slot) => {
      const subject = subjects.find((item) => item.id === slot.subjectId);
      return { ...slot, subjectName: subject?.name ?? "", hue: subject?.hue ?? 250 };
    }),
  };
}

const slotSchema = z.object({
  subjectId: z.number().int().positive(),
  date: z.string().refine(isDateString),
  startTime: z.string().refine(isTimeString),
  endTime: z.string().refine(isTimeString),
});

export async function applyScheduleAction(slots: ProposedSlot[]): Promise<{ message?: string; error?: string }> {
  await requireAdmin();
  const parsed = z.array(slotSchema).max(80).safeParse(slots);
  if (!parsed.success || parsed.data.length === 0) return { error: "没有可以加入的课程" };
  const subjectIds = new Set(listSubjects().map((subject) => subject.id));
  const db = getDb();
  let created = 0;
  let skipped = 0;
  db.transaction((tx) => {
    for (const slot of parsed.data) {
      if (!subjectIds.has(slot.subjectId)) {
        skipped += 1;
        continue;
      }
      const sameDay = tx
        .select({ startTime: lessons.startTime, endTime: lessons.endTime })
        .from(lessons)
        .where(and(isNull(lessons.deletedAt), ne(lessons.status, "cancelled"), gte(lessons.date, slot.date), lte(lessons.date, slot.date)))
        .all();
      const clash = sameDay.some(
        (row) => toMinutes(row.startTime) < toMinutes(slot.endTime) && toMinutes(slot.startTime) < toMinutes(row.endTime),
      );
      if (clash) {
        skipped += 1;
        continue;
      }
      tx.insert(lessons).values({ studentId: STUDENT_ID, ...slot, status: "planned" }).run();
      created += 1;
    }
  });
  logActivity({
    action: "schedule.apply",
    entityType: "lesson",
    entityId: parsed.data[0].date,
    summary: `排课助手：加入 ${created} 节课${skipped ? `，${skipped} 节因时间冲突跳过` : ""}`,
  });
  revalidatePath("/", "layout");
  return {
    message: `已加入 ${created} 节课${skipped ? `，${skipped} 节和已有课程冲突，已跳过` : ""}`,
  };
}
