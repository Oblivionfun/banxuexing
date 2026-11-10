import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or, sql } from "drizzle-orm";
import { STUDENT_ID, getDb } from "@/lib/db";
import {
  activity,
  availability,
  files,
  lessons,
  materialSets,
  settings,
  students,
  subjects,
  type Activity,
  type Availability,
  type FileRow,
  type Lesson,
  type MaterialSet,
  type Student,
  type Subject,
} from "@/lib/db/schema";
import { addDays } from "@/lib/time";

export type SubjectRef = Pick<Subject, "id" | "name" | "slug" | "hue" | "teacherName">;
export type LessonWithSubject = Lesson & { subject: SubjectRef };
export type SubjectWithStats = Subject & {
  materialCount: number;
  doneCount: number;
  lastLessonDate: string | null;
  nextLessonDate: string | null;
};
export type MaterialSetSummary = MaterialSet & {
  subject: SubjectRef;
  fileCount: number;
  coverFileId: string | null;
};

const subjectRef = {
  id: subjects.id,
  name: subjects.name,
  slug: subjects.slug,
  hue: subjects.hue,
  teacherName: subjects.teacherName,
};

export function getStudent(): Student {
  const row = getDb().select().from(students).where(eq(students.id, STUDENT_ID)).get();
  if (!row) throw new Error("学生资料缺失");
  return row;
}

export function getSetting(key: string): string | undefined {
  return getDb().select().from(settings).where(eq(settings.key, key)).get()?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function deleteSetting(key: string): void {
  getDb().delete(settings).where(eq(settings.key, key)).run();
}

export function listSubjects(): Subject[] {
  return getDb()
    .select()
    .from(subjects)
    .where(eq(subjects.studentId, STUDENT_ID))
    .orderBy(asc(subjects.sortOrder), asc(subjects.id))
    .all();
}

export function getSubjectBySlug(slug: string): Subject | undefined {
  return getDb()
    .select()
    .from(subjects)
    .where(and(eq(subjects.studentId, STUDENT_ID), eq(subjects.slug, slug)))
    .get();
}

export function getSubjectById(id: number): Subject | undefined {
  return getDb().select().from(subjects).where(eq(subjects.id, id)).get();
}

export function listSubjectsWithStats(today: string): SubjectWithStats[] {
  const db = getDb();
  const materialCounts = db
    .select({ subjectId: materialSets.subjectId, count: sql<number>`count(*)` })
    .from(materialSets)
    .where(isNull(materialSets.deletedAt))
    .groupBy(materialSets.subjectId)
    .all();
  const lessonStats = db
    .select({
      subjectId: lessons.subjectId,
      doneCount: sql<number>`sum(case when ${lessons.status} = 'done' then 1 else 0 end)`,
      lastDate: sql<
        string | null
      >`max(case when ${lessons.status} = 'done' then ${lessons.date} end)`,
      nextDate: sql<
        string | null
      >`min(case when ${lessons.status} = 'planned' and ${lessons.date} >= ${today} then ${lessons.date} end)`,
    })
    .from(lessons)
    .where(isNull(lessons.deletedAt))
    .groupBy(lessons.subjectId)
    .all();

  return listSubjects().map((subject) => {
    const stats = lessonStats.find((row) => row.subjectId === subject.id);
    return {
      ...subject,
      materialCount: materialCounts.find((row) => row.subjectId === subject.id)?.count ?? 0,
      doneCount: stats?.doneCount ?? 0,
      lastLessonDate: stats?.lastDate ?? null,
      nextLessonDate: stats?.nextDate ?? null,
    };
  });
}

function lessonRows(where: ReturnType<typeof and>, order: "asc" | "desc" = "asc") {
  const rows = getDb()
    .select({ lesson: lessons, subject: subjectRef })
    .from(lessons)
    .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
    .where(where)
    .orderBy(
      order === "asc" ? asc(lessons.date) : desc(lessons.date),
      order === "asc" ? asc(lessons.startTime) : desc(lessons.startTime),
    )
    .all();
  return rows.map(({ lesson, subject }) => ({ ...lesson, subject }));
}

export function listLessonsBetween(start: string, end: string): LessonWithSubject[] {
  return lessonRows(
    and(isNull(lessons.deletedAt), gte(lessons.date, start), lte(lessons.date, end)),
  );
}

export function listLessonsForSubject(subjectId: number): LessonWithSubject[] {
  return lessonRows(and(isNull(lessons.deletedAt), eq(lessons.subjectId, subjectId)), "desc");
}

export function listAllLessons(limit = 300): LessonWithSubject[] {
  return lessonRows(and(isNull(lessons.deletedAt)), "desc").slice(0, limit);
}

const hasNotes = or(
  ne(lessons.summaryMd, ""),
  ne(lessons.homework, ""),
  ne(lessons.prep, ""),
);

export function listRecentNotes(limit = 6): LessonWithSubject[] {
  return lessonRows(and(isNull(lessons.deletedAt), eq(lessons.status, "done"), hasNotes), "desc").slice(
    0,
    limit,
  );
}

/** 最近两周每个科目最新一次的作业和下节准备。 */
export function listRecentAssignments(today: string, days = 14): LessonWithSubject[] {
  const rows = lessonRows(
    and(
      isNull(lessons.deletedAt),
      eq(lessons.status, "done"),
      gte(lessons.date, addDays(today, -days)),
      or(ne(lessons.homework, ""), ne(lessons.prep, "")),
    ),
    "desc",
  );
  const seen = new Set<number>();
  return rows.filter((row) => {
    if (seen.has(row.subjectId)) return false;
    seen.add(row.subjectId);
    return true;
  });
}

export function getLesson(
  id: number,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): { lesson: LessonWithSubject; files: FileRow[] } | undefined {
  const [lesson] = lessonRows(
    includeDeleted ? and(eq(lessons.id, id)) : and(eq(lessons.id, id), isNull(lessons.deletedAt)),
  );
  if (!lesson) return undefined;
  const attached = getDb()
    .select()
    .from(files)
    .where(and(eq(files.lessonId, id), isNull(files.deletedAt)))
    .orderBy(asc(files.sortOrder), asc(files.createdAt))
    .all();
  return { lesson, files: attached };
}

export function listMaterialSets(subjectId?: number): MaterialSetSummary[] {
  const db = getDb();
  const sets = db
    .select({ set: materialSets, subject: subjectRef })
    .from(materialSets)
    .innerJoin(subjects, eq(materialSets.subjectId, subjects.id))
    .where(
      subjectId === undefined
        ? isNull(materialSets.deletedAt)
        : and(isNull(materialSets.deletedAt), eq(materialSets.subjectId, subjectId)),
    )
    .orderBy(desc(materialSets.createdAt))
    .all();
  if (sets.length === 0) return [];

  const ids = sets.map(({ set }) => set.id);
  const setFiles = db
    .select({ id: files.id, setId: files.setId, kind: files.kind, sortOrder: files.sortOrder })
    .from(files)
    .where(and(inArray(files.setId, ids), isNull(files.deletedAt)))
    .orderBy(asc(files.sortOrder), asc(files.createdAt))
    .all();

  return sets.map(({ set, subject }) => {
    const own = setFiles.filter((file) => file.setId === set.id);
    return {
      ...set,
      subject,
      fileCount: own.length,
      coverFileId: own.find((file) => file.kind === "image")?.id ?? null,
    };
  });
}

export function getMaterialSet(
  id: number,
  { includeDeleted = false }: { includeDeleted?: boolean } = {},
): { set: MaterialSet; subject: Subject; files: FileRow[] } | undefined {
  const db = getDb();
  const row = db
    .select({ set: materialSets, subject: subjects })
    .from(materialSets)
    .innerJoin(subjects, eq(materialSets.subjectId, subjects.id))
    .where(
      includeDeleted
        ? eq(materialSets.id, id)
        : and(eq(materialSets.id, id), isNull(materialSets.deletedAt)),
    )
    .get();
  if (!row) return undefined;
  const setFiles = db
    .select()
    .from(files)
    .where(and(eq(files.setId, id), isNull(files.deletedAt)))
    .orderBy(asc(files.sortOrder), asc(files.createdAt))
    .all();
  return { ...row, files: setFiles };
}

export function getFile(id: string): FileRow | undefined {
  return getDb().select().from(files).where(eq(files.id, id)).get();
}

export function nextFileSortOrder(target: { setId?: number; lessonId?: number }): number {
  const where =
    target.setId !== undefined ? eq(files.setId, target.setId) : eq(files.lessonId, target.lessonId ?? -1);
  const row = getDb()
    .select({ max: sql<number | null>`max(${files.sortOrder})` })
    .from(files)
    .where(where)
    .get();
  return (row?.max ?? -1) + 1;
}

export function listActivity(limit = 20): Activity[] {
  return getDb().select().from(activity).orderBy(desc(activity.at)).limit(limit).all();
}

export function logActivity(entry: {
  action: string;
  entityType: string;
  entityId: string | number;
  summary: string;
}): void {
  getDb()
    .insert(activity)
    .values({ ...entry, entityId: String(entry.entityId) })
    .run();
}

export function listTrash() {
  const db = getDb();
  const deletedLessons = lessonRows(and(isNotNull(lessons.deletedAt)), "desc");
  const deletedSets = db
    .select({ set: materialSets, subject: subjectRef })
    .from(materialSets)
    .innerJoin(subjects, eq(materialSets.subjectId, subjects.id))
    .where(isNotNull(materialSets.deletedAt))
    .orderBy(desc(materialSets.deletedAt))
    .all()
    .map(({ set, subject }) => ({ ...set, subject }));
  const deletedFiles = db
    .select()
    .from(files)
    .where(isNotNull(files.deletedAt))
    .orderBy(desc(files.deletedAt))
    .all();
  return { lessons: deletedLessons, sets: deletedSets, files: deletedFiles };
}

export function listAvailability(): Availability[] {
  return getDb()
    .select()
    .from(availability)
    .orderBy(asc(availability.weekday), asc(availability.startTime))
    .all();
}
