import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  AVAILABILITY_OWNERS,
  FILE_KINDS,
  LESSON_SOURCES,
  LESSON_STATUSES,
  MATERIAL_CATEGORIES,
} from "@/lib/enums";

export * from "@/lib/enums";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

const deletedAt = () => integer("deleted_at", { mode: "timestamp_ms" });

export const students = sqliteTable("students", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  grade: text("grade").notNull().default(""),
  intro: text("intro").notNull().default(""),
  createdAt: createdAt(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const subjects = sqliteTable(
  "subjects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    hue: integer("hue").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    teacherName: text("teacher_name").notNull().default(""),
    teacherNote: text("teacher_note").notNull().default(""),
    planMd: text("plan_md").notNull().default(""),
    planUpdatedAt: integer("plan_updated_at", { mode: "timestamp_ms" }),
    weeklyLessons: integer("weekly_lessons").notNull().default(1),
    lessonMinutes: integer("lesson_minutes").notNull().default(90),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("subjects_student_slug").on(t.studentId, t.slug)],
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    date: text("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status", { enum: LESSON_STATUSES }).notNull().default("planned"),
    topic: text("topic").notNull().default(""),
    summaryMd: text("summary_md").notNull().default(""),
    homework: text("homework").notNull().default(""),
    prep: text("prep").notNull().default(""),
    recordingUrl: text("recording_url").notNull().default(""),
    source: text("source", { enum: LESSON_SOURCES }).notNull().default("manual"),
    notifiedAt: integer("notified_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("lessons_date").on(t.date, t.startTime),
    index("lessons_subject_date").on(t.subjectId, t.date),
  ],
);

export const materialSets = sqliteTable(
  "material_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id),
    category: text("category", { enum: MATERIAL_CATEGORIES }).notNull().default("other"),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    notifiedAt: integer("notified_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index("material_sets_subject").on(t.subjectId)],
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    setId: integer("set_id").references(() => materialSets.id),
    lessonId: integer("lesson_id").references(() => lessons.id),
    originalName: text("original_name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    kind: text("kind", { enum: FILE_KINDS }).notNull(),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("files_set").on(t.setId, t.sortOrder),
    index("files_lesson").on(t.lessonId, t.sortOrder),
    index("files_sha").on(t.sha256),
  ],
);

export const activity = sqliteTable(
  "activity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    summary: text("summary").notNull(),
  },
  (t) => [index("activity_at").on(t.at)],
);

export const availability = sqliteTable(
  "availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerType: text("owner_type", { enum: AVAILABILITY_OWNERS }).notNull(),
    subjectId: integer("subject_id").references(() => subjects.id),
    weekday: integer("weekday").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("availability_owner").on(t.ownerType, t.subjectId)],
);

export type Student = typeof students.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type MaterialSet = typeof materialSets.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type Availability = typeof availability.$inferSelect;
