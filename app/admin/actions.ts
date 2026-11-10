"use server";

import { and, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { STUDENT_ID, dataDir, getDb } from "@/lib/db";
import {
  LESSON_SOURCES,
  LESSON_STATUSES,
  MATERIAL_CATEGORIES,
  availability,
  files,
  lessons,
  materialSets,
  students,
  subjects,
} from "@/lib/db/schema";
import { materialCategoryLabel } from "@/lib/labels";
import { getLesson, getMaterialSet, getSubjectById, logActivity } from "@/lib/queries";
import { removeBlob } from "@/lib/storage";
import { SUBJECT_HUES } from "@/lib/subjects";
import {
  addDays,
  formatDateWithWeekday,
  formatMonthDay,
  isDateString,
  isTimeString,
  toMinutes,
  weekStart,
} from "@/lib/time";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  needsConfirm?: boolean;
};

function refreshAll() {
  revalidatePath("/", "layout");
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/* ---------------- 课程 ---------------- */

const lessonSchema = z
  .object({
    subjectId: z.coerce.number().int().positive("请选择科目"),
    date: z.string().refine(isDateString, "请选择日期"),
    startTime: z.string().refine(isTimeString, "请填写开始时间"),
    endTime: z.string().refine(isTimeString, "请填写结束时间"),
    status: z.enum(LESSON_STATUSES, { message: "请选择状态" }),
    topic: z.string().trim().max(100, "主题最多 100 字"),
    summaryMd: z.string().max(20000, "内容太长了"),
    homework: z.string().max(5000, "内容太长了"),
    prep: z.string().max(5000, "内容太长了"),
    planMd: z.string().max(10000, "内容太长了"),
    planPrep: z.string().max(5000, "内容太长了"),
    recordingUrl: z.union([z.literal(""), z.url("请填写完整的链接，以 http 开头")]),
    source: z.enum(LESSON_SOURCES),
  })
  .refine((data) => toMinutes(data.endTime) > toMinutes(data.startTime), {
    path: ["endTime"],
    message: "结束时间要晚于开始时间",
  });

function readLesson(formData: FormData) {
  return lessonSchema.safeParse({
    subjectId: text(formData, "subjectId"),
    date: text(formData, "date"),
    startTime: text(formData, "startTime"),
    endTime: text(formData, "endTime"),
    status: text(formData, "status") || "planned",
    topic: text(formData, "topic"),
    summaryMd: text(formData, "summaryMd").trim(),
    homework: text(formData, "homework").trim(),
    prep: text(formData, "prep").trim(),
    planMd: text(formData, "planMd").trim(),
    planPrep: text(formData, "planPrep").trim(),
    recordingUrl: text(formData, "recordingUrl").trim(),
    source: text(formData, "source") || "manual",
  });
}

function findOverlap(
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: number,
): { subject: string; startTime: string; endTime: string } | undefined {
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
    (row) =>
      row.id !== excludeId && toMinutes(row.startTime) < end && toMinutes(row.endTime) > start,
  );
}

export async function saveLessonAction(
  lessonId: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = readLesson(formData);
  if (!parsed.success) {
    return { error: "有几项需要修改，请看标红的地方。", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const data = parsed.data;
  const subject = getSubjectById(data.subjectId);
  if (!subject) return { error: "科目不存在，请刷新页面", fieldErrors: { subjectId: "请重新选择" } };

  if (data.status !== "cancelled" && text(formData, "allowOverlap") !== "1") {
    const overlap = findOverlap(data.date, data.startTime, data.endTime, lessonId ?? undefined);
    if (overlap) {
      return {
        needsConfirm: true,
        error: `这个时间和${overlap.subject} ${overlap.startTime}–${overlap.endTime} 冲突。确认没问题的话，再点一次保存。`,
      };
    }
  }

  const db = getDb();
  let id = lessonId;
  if (id === null) {
    const inserted = db
      .insert(lessons)
      .values({ studentId: STUDENT_ID, ...data })
      .returning({ id: lessons.id })
      .get();
    id = inserted.id;
    logActivity({
      action: "lesson.create",
      entityType: "lesson",
      entityId: id,
      summary: `新增课程：${subject.name} ${formatDateWithWeekday(data.date)} ${data.startTime}`,
    });
  } else {
    const existing = getLesson(id);
    if (!existing) return { error: "这节课不存在，可能已被删除" };
    db.update(lessons).set(data).where(eq(lessons.id, id)).run();
    const wroteNotes =
      data.summaryMd !== existing.lesson.summaryMd ||
      data.homework !== existing.lesson.homework ||
      data.prep !== existing.lesson.prep;
    const wrotePlan = data.planMd !== existing.lesson.planMd || data.planPrep !== existing.lesson.planPrep;
    const [action, verb] = wroteNotes
      ? ["lesson.notes", "更新纪要"]
      : wrotePlan
        ? ["lesson.plan", "更新课前计划"]
        : ["lesson.update", "修改课程"];
    logActivity({
      action,
      entityType: "lesson",
      entityId: id,
      summary: `${verb}：${subject.name} ${formatMonthDay(data.date)}`,
    });
  }
  refreshAll();
  if (lessonId === null) redirect(`/admin/lessons/${id}?saved=1`);
  return { ok: true, message: "已保存" };
}

export async function deleteLessonAction(lessonId: number): Promise<void> {
  await requireAdmin();
  const existing = getLesson(lessonId);
  if (!existing) redirect("/admin/lessons");
  getDb().update(lessons).set({ deletedAt: new Date() }).where(eq(lessons.id, lessonId)).run();
  logActivity({
    action: "lesson.delete",
    entityType: "lesson",
    entityId: lessonId,
    summary: `删除课程：${existing.lesson.subject.name} ${formatMonthDay(existing.lesson.date)}（可在回收站恢复）`,
  });
  refreshAll();
  redirect("/admin/lessons?deleted=1");
}

export async function copyWeekAction(fromStart: string, toStart: string): Promise<FormState> {
  await requireAdmin();
  if (!isDateString(fromStart) || !isDateString(toStart)) return { error: "日期不正确" };
  const from = weekStart(fromStart);
  const to = weekStart(toStart);
  const offset = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
  const db = getDb();
  const source = db
    .select()
    .from(lessons)
    .where(
      and(
        isNull(lessons.deletedAt),
        ne(lessons.status, "cancelled"),
        gte(lessons.date, from),
        lte(lessons.date, addDays(from, 6)),
      ),
    )
    .all();
  if (source.length === 0) return { error: "那一周没有可以复制的课程" };

  const target = db
    .select({ subjectId: lessons.subjectId, date: lessons.date, startTime: lessons.startTime })
    .from(lessons)
    .where(and(isNull(lessons.deletedAt), gte(lessons.date, to), lte(lessons.date, addDays(to, 6))))
    .all();
  const taken = new Set(target.map((row) => `${row.subjectId}|${row.date}|${row.startTime}`));

  let created = 0;
  db.transaction((tx) => {
    for (const lesson of source) {
      const date = addDays(lesson.date, offset);
      const key = `${lesson.subjectId}|${date}|${lesson.startTime}`;
      if (taken.has(key)) continue;
      tx.insert(lessons)
        .values({
          studentId: STUDENT_ID,
          subjectId: lesson.subjectId,
          date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          status: "planned",
        })
        .run();
      taken.add(key);
      created += 1;
    }
  });
  logActivity({
    action: "lesson.copyWeek",
    entityType: "lesson",
    entityId: to,
    summary: `复制课表：${formatMonthDay(from)} 那周 → ${formatMonthDay(to)} 那周，新增 ${created} 节`,
  });
  refreshAll();
  return created > 0
    ? { ok: true, message: `已新增 ${created} 节课` }
    : { ok: true, message: "目标周已经有这些课了，没有新增" };
}

/* ---------------- 资料册 ---------------- */

const materialSetSchema = z.object({
  subjectId: z.coerce.number().int().positive("请选择科目"),
  category: z.enum(MATERIAL_CATEGORIES, { message: "请选择类别" }),
  title: z.string().trim().min(1, "请填写标题").max(80, "标题最多 80 字"),
  note: z.string().trim().max(1000, "备注最多 1000 字"),
});

export async function createMaterialSetAction(input: {
  subjectId: number;
  category: string;
  title: string;
  note?: string;
}): Promise<{ id?: number; error?: string; fieldErrors?: Record<string, string> }> {
  await requireAdmin();
  const parsed = materialSetSchema.safeParse({ note: "", ...input });
  if (!parsed.success) {
    return { error: "请补全资料信息", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const subject = getSubjectById(parsed.data.subjectId);
  if (!subject) return { error: "科目不存在，请刷新页面" };
  const row = getDb()
    .insert(materialSets)
    .values({ studentId: STUDENT_ID, ...parsed.data })
    .returning({ id: materialSets.id })
    .get();
  logActivity({
    action: "material.create",
    entityType: "material_set",
    entityId: row.id,
    summary: `新建资料册：${subject.name} ${materialCategoryLabel(parsed.data.category)}「${parsed.data.title}」`,
  });
  refreshAll();
  return { id: row.id };
}

export async function updateMaterialSetAction(
  setId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = materialSetSchema.safeParse({
    subjectId: text(formData, "subjectId"),
    category: text(formData, "category"),
    title: text(formData, "title"),
    note: text(formData, "note"),
  });
  if (!parsed.success) {
    return { error: "有几项需要修改，请看标红的地方。", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  getDb().update(materialSets).set(parsed.data).where(eq(materialSets.id, setId)).run();
  logActivity({
    action: "material.update",
    entityType: "material_set",
    entityId: setId,
    summary: `修改资料册「${parsed.data.title}」`,
  });
  refreshAll();
  return { ok: true, message: "已保存" };
}

export async function deleteMaterialSetAction(setId: number): Promise<void> {
  await requireAdmin();
  const found = getMaterialSet(setId);
  if (found) {
    getDb()
      .update(materialSets)
      .set({ deletedAt: new Date() })
      .where(eq(materialSets.id, setId))
      .run();
    logActivity({
      action: "material.delete",
      entityType: "material_set",
      entityId: setId,
      summary: `删除资料册「${found.set.title}」（可在回收站恢复）`,
    });
  }
  refreshAll();
  redirect("/admin/materials?deleted=1");
}

/* ---------------- 单个文件 ---------------- */

export async function deleteFileAction(fileId: string): Promise<void> {
  await requireAdmin();
  getDb().update(files).set({ deletedAt: new Date() }).where(eq(files.id, fileId)).run();
  refreshAll();
}

export async function moveFileAction(fileId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  const db = getDb();
  const file = db.select().from(files).where(eq(files.id, fileId)).get();
  if (!file) return;
  const siblings = db
    .select({ id: files.id, sortOrder: files.sortOrder })
    .from(files)
    .where(
      and(
        isNull(files.deletedAt),
        file.setId !== null ? eq(files.setId, file.setId) : eq(files.lessonId, file.lessonId ?? -1),
      ),
    )
    .all()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const index = siblings.findIndex((item) => item.id === fileId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= siblings.length) return;
  const reordered = [...siblings];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  db.transaction((tx) => {
    reordered.forEach((item, order) => {
      tx.update(files).set({ sortOrder: order }).where(eq(files.id, item.id)).run();
    });
  });
  refreshAll();
}

/* ---------------- 回收站 ---------------- */

export async function restoreAction(kind: "lesson" | "set" | "file", id: string): Promise<void> {
  await requireAdmin();
  const db = getDb();
  switch (kind) {
    case "lesson":
      db.update(lessons).set({ deletedAt: null }).where(eq(lessons.id, Number(id))).run();
      break;
    case "set":
      db.update(materialSets).set({ deletedAt: null }).where(eq(materialSets.id, Number(id))).run();
      break;
    case "file":
      db.update(files).set({ deletedAt: null }).where(eq(files.id, id)).run();
      break;
    default: {
      const unreachable: never = kind;
      throw new Error(`unknown kind ${unreachable}`);
    }
  }
  logActivity({ action: "trash.restore", entityType: kind, entityId: id, summary: "从回收站恢复了一项内容" });
  refreshAll();
}

async function purgeFiles(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  const db = getDb();
  const rows = db.select().from(files).where(inArray(files.id, fileIds)).all();
  db.delete(files).where(inArray(files.id, fileIds)).run();
  const root = dataDir();
  for (const sha of new Set(rows.map((row) => row.sha256))) {
    const stillUsed = db.select({ id: files.id }).from(files).where(eq(files.sha256, sha)).get();
    if (!stillUsed) await removeBlob(root, sha);
  }
}

export async function purgeAction(kind: "lesson" | "set" | "file", id: string): Promise<void> {
  await requireAdmin();
  const db = getDb();
  switch (kind) {
    case "lesson": {
      const lessonId = Number(id);
      const attached = db.select({ id: files.id }).from(files).where(eq(files.lessonId, lessonId)).all();
      await purgeFiles(attached.map((row) => row.id));
      db.delete(lessons).where(eq(lessons.id, lessonId)).run();
      break;
    }
    case "set": {
      const setId = Number(id);
      const attached = db.select({ id: files.id }).from(files).where(eq(files.setId, setId)).all();
      await purgeFiles(attached.map((row) => row.id));
      db.delete(materialSets).where(eq(materialSets.id, setId)).run();
      break;
    }
    case "file":
      await purgeFiles([id]);
      break;
    default: {
      const unreachable: never = kind;
      throw new Error(`unknown kind ${unreachable}`);
    }
  }
  logActivity({ action: "trash.purge", entityType: kind, entityId: id, summary: "彻底删除了一项内容" });
  refreshAll();
}

/* ---------------- 科目与老师 ---------------- */

const subjectSchema = z.object({
  name: z.string().trim().min(1, "请填写科目名").max(12, "科目名最多 12 字"),
  hue: z.coerce
    .number()
    .int()
    .refine((value) => (SUBJECT_HUES as readonly number[]).includes(value), "请选择一个颜色"),
  sortOrder: z.coerce.number().int().min(0).max(99),
  teacherName: z.string().trim().max(20, "最多 20 字"),
  teacherNote: z.string().trim().max(200, "最多 200 字"),
  planMd: z.string().max(20000, "内容太长了"),
  weeklyLessons: z.coerce.number().int().min(0, "不能小于 0").max(14, "每周最多 14 节"),
  lessonMinutes: z.coerce.number().int().min(30, "至少 30 分钟").max(240, "最多 240 分钟"),
});

function readSubject(formData: FormData) {
  return subjectSchema.safeParse({
    name: text(formData, "name"),
    hue: text(formData, "hue"),
    sortOrder: text(formData, "sortOrder") || "0",
    teacherName: text(formData, "teacherName"),
    teacherNote: text(formData, "teacherNote"),
    planMd: text(formData, "planMd").trim(),
    weeklyLessons: text(formData, "weeklyLessons") || "1",
    lessonMinutes: text(formData, "lessonMinutes") || "90",
  });
}

export async function saveSubjectAction(
  subjectId: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = readSubject(formData);
  if (!parsed.success) {
    return { error: "有几项需要修改，请看标红的地方。", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const db = getDb();
  if (subjectId === null) {
    const slug = `s${Date.now().toString(36)}`;
    const row = db
      .insert(subjects)
      .values({ studentId: STUDENT_ID, slug, ...parsed.data, planUpdatedAt: parsed.data.planMd ? new Date() : null })
      .returning({ id: subjects.id })
      .get();
    logActivity({ action: "subject.create", entityType: "subject", entityId: row.id, summary: `新增科目：${parsed.data.name}` });
    refreshAll();
    redirect(`/admin/subjects/${row.id}?saved=1`);
  }
  const existing = getSubjectById(subjectId);
  if (!existing) return { error: "科目不存在，请刷新页面" };
  const planChanged = existing.planMd !== parsed.data.planMd;
  db.update(subjects)
    .set({ ...parsed.data, ...(planChanged ? { planUpdatedAt: new Date() } : {}) })
    .where(eq(subjects.id, subjectId))
    .run();
  logActivity({
    action: planChanged ? "subject.plan" : "subject.update",
    entityType: "subject",
    entityId: subjectId,
    summary: planChanged ? `更新老师规划：${parsed.data.name}` : `修改科目：${parsed.data.name}`,
  });
  refreshAll();
  return { ok: true, message: "已保存" };
}

export async function deleteSubjectAction(subjectId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const hasLessons = db.select({ id: lessons.id }).from(lessons).where(eq(lessons.subjectId, subjectId)).get();
  const hasSets = db
    .select({ id: materialSets.id })
    .from(materialSets)
    .where(eq(materialSets.subjectId, subjectId))
    .get();
  if (hasLessons || hasSets) {
    return { error: "这个科目下已有课程或资料（包括回收站里的），不能删除。可以改名继续使用。" };
  }
  const subject = getSubjectById(subjectId);
  db.transaction((tx) => {
    tx.delete(availability).where(eq(availability.subjectId, subjectId)).run();
    tx.delete(subjects).where(eq(subjects.id, subjectId)).run();
  });
  logActivity({ action: "subject.delete", entityType: "subject", entityId: subjectId, summary: `删除科目：${subject?.name ?? ""}` });
  refreshAll();
  redirect("/admin/subjects");
}

/* ---------------- 学生 ---------------- */

const studentSchema = z.object({
  name: z.string().trim().min(1, "请填写称呼").max(20, "最多 20 字"),
  grade: z.string().trim().max(20, "最多 20 字"),
  intro: z.string().trim().max(500, "最多 500 字"),
});

export async function saveStudentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = studentSchema.safeParse({
    name: text(formData, "name"),
    grade: text(formData, "grade"),
    intro: text(formData, "intro"),
  });
  if (!parsed.success) {
    return { error: "有几项需要修改，请看标红的地方。", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  getDb().update(students).set(parsed.data).where(eq(students.id, STUDENT_ID)).run();
  logActivity({ action: "student.update", entityType: "student", entityId: STUDENT_ID, summary: "修改了学生信息" });
  refreshAll();
  return { ok: true, message: "已保存" };
}
