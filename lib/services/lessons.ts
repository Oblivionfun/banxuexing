import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { STUDENT_ID, getDb } from "@/lib/db";
import { lessons, subjects } from "@/lib/db/schema";
import type { LessonSource, LessonStatus } from "@/lib/enums";
import { getSubjectById, logActivity } from "@/lib/queries";
import { formatDateWithWeekday, toMinutes } from "@/lib/time";

export type LessonConflict = { subject: string; startTime: string; endTime: string };

export class LessonConflictError extends Error {
  constructor(readonly conflict: LessonConflict) {
    super(
      `这个时间和${conflict.subject} ${conflict.startTime}–${conflict.endTime} 冲突。确认没问题的话，再显式允许重叠。`,
    );
    this.name = "LessonConflictError";
  }
}

export function findOverlap(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: number,
): LessonConflict | undefined {
  const sameDay = getDb()
    .select({
      id: lessons.id,
      startTime: lessons.startTime,
      endTime: lessons.endTime,
      subject: subjects.name,
    })
    .from(lessons)
    .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
    .where(and(eq(lessons.date, date), isNull(lessons.deletedAt), ne(lessons.status, "cancelled")))
    .all();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  return sameDay.find(
    (row) => row.id !== excludeId && toMinutes(row.startTime) < end && toMinutes(row.endTime) > start,
  );
}

export type LessonCreateInput = {
  subjectId: number;
  date: string;
  startTime: string;
  endTime: string;
  status?: LessonStatus;
  topic?: string;
  summaryMd?: string;
  homework?: string;
  prep?: string;
  planMd?: string;
  planPrep?: string;
  recordingUrl?: string;
  source?: LessonSource;
};

export function createLesson(
  input: LessonCreateInput,
  { allowOverlap = false, actor = "工作人员" }: { allowOverlap?: boolean; actor?: string } = {},
): { id: number } {
  const subject = getSubjectById(input.subjectId);
  if (!subject) throw new Error("科目不存在，请刷新页面");
  if (toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    throw new Error("结束时间要晚于开始时间");
  }

  const status = input.status ?? "planned";
  if (status !== "cancelled" && !allowOverlap) {
    const overlap = findOverlap(input.date, input.startTime, input.endTime);
    if (overlap) throw new LessonConflictError(overlap);
  }

  const row = getDb()
    .insert(lessons)
    .values({
      studentId: STUDENT_ID,
      subjectId: input.subjectId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status,
      topic: input.topic ?? "",
      summaryMd: input.summaryMd ?? "",
      homework: input.homework ?? "",
      prep: input.prep ?? "",
      planMd: input.planMd ?? "",
      planPrep: input.planPrep ?? "",
      recordingUrl: input.recordingUrl ?? "",
      source: input.source ?? "manual",
    })
    .returning({ id: lessons.id })
    .get();

  logActivity({
    action: "lesson.create",
    entityType: "lesson",
    entityId: row.id,
    summary: `新增课程：${subject.name} ${formatDateWithWeekday(input.date)} ${input.startTime}`,
    actor,
  });
  return { id: row.id };
}
