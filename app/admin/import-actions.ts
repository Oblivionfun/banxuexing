"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { structureGroupMessageWithAi } from "@/lib/ai";
import { requireAdmin } from "@/lib/auth";
import { STUDENT_ID, getDb } from "@/lib/db";
import { lessons, subjects } from "@/lib/db/schema";
import { isAiConfigured } from "@/lib/env";
import {
  parseGroupMessage,
  suggestLesson,
  type GroupMessageKind,
  type LessonCandidate,
  type ParsedGroupMessage,
} from "@/lib/group-message";
import { getLesson, getSubjectById, listLessonsAround, listSubjects, logActivity } from "@/lib/queries";
import { formatMonthDay, isDateString, isTimeString, todayKey, toMinutes } from "@/lib/time";

export type AnalyzeResult =
  | {
      ok: true;
      parsed: ParsedGroupMessage;
      engine: "ai" | "rules";
      note?: string;
      candidates: LessonCandidate[];
      suggestedLessonId: number | null;
    }
  | { ok: false; error: string };

function lessonCandidates(subjectId: number, date: string): LessonCandidate[] {
  return listLessonsAround(subjectId, date).map((lesson) => ({
    id: lesson.id,
    date: lesson.date,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    topic: lesson.topic,
    hasPlan: Boolean(lesson.planMd || lesson.planPrep),
    hasNotes: Boolean(lesson.summaryMd || lesson.homework || lesson.prep),
  }));
}

export async function analyzeGroupMessageAction(raw: string): Promise<AnalyzeResult> {
  await requireAdmin();
  const text = raw.trim();
  if (!text) return { ok: false, error: "请先粘贴老师在群里发的消息" };
  if (text.length > 8000) return { ok: false, error: "内容太长了，请一次粘贴一条消息" };

  const today = todayKey();
  const subjectNames = listSubjects().map(({ id, name }) => ({ id, name }));
  const rules = parseGroupMessage(text, { subjects: subjectNames, today });
  let parsed = rules;
  let engine: "ai" | "rules" = "rules";
  let note: string | undefined;
  if (isAiConfigured()) {
    try {
      const ai = await structureGroupMessageWithAi(text, { subjects: subjectNames, today });
      parsed = {
        ...ai,
        subjectId: ai.subjectId ?? rules.subjectId,
        date: ai.date ?? rules.date,
        startTime: ai.startTime ?? rules.startTime,
      };
      engine = "ai";
    } catch (error) {
      console.error("[ai] group message failed, falling back to rules", error);
      note = "大模型暂时不可用，已按规则识别，请仔细检查";
    }
  }

  const candidates = parsed.subjectId ? lessonCandidates(parsed.subjectId, parsed.date ?? today) : [];
  const suggestedLessonId = suggestLesson(candidates, {
    kind: parsed.kind ?? "notes",
    date: parsed.date,
    startTime: parsed.startTime,
    today,
  });
  return { ok: true, parsed, engine, note, candidates, suggestedLessonId };
}

export async function lessonCandidatesAction(subjectId: number, date: string): Promise<LessonCandidate[]> {
  await requireAdmin();
  if (!Number.isInteger(subjectId) || !isDateString(date)) return [];
  return lessonCandidates(subjectId, date);
}

const applySchema = z
  .object({
    kind: z.enum(["plan", "notes"]),
    subjectId: z.number().int().positive("请选择科目"),
    lessonId: z.number().int().positive().nullable(),
    date: z.string().refine(isDateString, "请选择日期"),
    startTime: z.string(),
    endTime: z.string(),
    topic: z.string().trim().max(100, "主题最多 100 字"),
    planMd: z.string().trim().max(10000, "内容太长了"),
    planPrep: z.string().trim().max(5000, "内容太长了"),
    summary: z.string().trim().max(20000, "内容太长了"),
    homework: z.string().trim().max(5000, "内容太长了"),
    prep: z.string().trim().max(5000, "内容太长了"),
    teacherName: z.string().trim().max(20, "老师称呼最多 20 字"),
  })
  .superRefine((data, ctx) => {
    if (data.lessonId !== null) return;
    if (!isTimeString(data.startTime)) ctx.addIssue({ code: "custom", path: ["startTime"], message: "请填写开始时间" });
    if (!isTimeString(data.endTime)) ctx.addIssue({ code: "custom", path: ["endTime"], message: "请填写结束时间" });
    else if (isTimeString(data.startTime) && toMinutes(data.endTime) <= toMinutes(data.startTime)) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "结束时间要晚于开始时间" });
    }
  });

export type ApplyInput = z.input<typeof applySchema>;

export type ApplyResult =
  | { ok: true; lessonId: number; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function kindLabel(kind: GroupMessageKind): string {
  switch (kind) {
    case "plan":
      return "课前计划";
    case "notes":
      return "课后纪要";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export async function applyGroupMessageAction(input: ApplyInput): Promise<ApplyResult> {
  await requireAdmin();
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, error: "有几项需要修改，请看标红的地方。", fieldErrors };
  }
  const data = parsed.data;
  const subject = getSubjectById(data.subjectId);
  if (!subject) return { ok: false, error: "科目不存在，请刷新页面" };

  const content =
    data.kind === "plan"
      ? { planMd: data.planMd, planPrep: data.planPrep }
      : { summaryMd: data.summary, homework: data.homework, prep: data.prep, status: "done" as const, source: "wechat" as const };
  const empty = data.kind === "plan" ? !data.planMd && !data.planPrep : !data.summary && !data.homework && !data.prep;
  if (empty) return { ok: false, error: `${kindLabel(data.kind)}是空的，请检查一下内容` };

  const db = getDb();
  let lessonId = data.lessonId;
  let date = data.date;
  if (lessonId !== null) {
    const existing = getLesson(lessonId);
    if (!existing) return { ok: false, error: "这节课不存在，可能已被删除，请重新选择" };
    if (existing.lesson.subjectId !== data.subjectId) return { ok: false, error: "选中的课和科目对不上，请重新选择" };
    date = existing.lesson.date;
    db.update(lessons)
      .set({ ...content, ...(data.topic ? { topic: data.topic } : {}) })
      .where(eq(lessons.id, lessonId))
      .run();
  } else {
    lessonId = db
      .insert(lessons)
      .values({
        studentId: STUDENT_ID,
        subjectId: data.subjectId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        topic: data.topic,
        ...content,
      })
      .returning({ id: lessons.id })
      .get().id;
  }

  const teacherChanged = Boolean(data.teacherName) && data.teacherName !== subject.teacherName;
  if (teacherChanged) {
    db.update(subjects).set({ teacherName: data.teacherName }).where(eq(subjects.id, subject.id)).run();
  }
  logActivity({
    action: data.kind === "plan" ? "lesson.plan" : "lesson.notes",
    entityType: "lesson",
    entityId: lessonId,
    summary: `导入群消息：${subject.name} ${formatMonthDay(date)}${kindLabel(data.kind)}${
      teacherChanged ? `，老师改为${data.teacherName}` : ""
    }`,
  });
  revalidatePath("/", "layout");
  return { ok: true, lessonId, message: `已写入${subject.name} ${formatMonthDay(date)}的${kindLabel(data.kind)}` };
}
