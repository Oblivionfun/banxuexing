import type { Lesson } from "@/lib/db/schema";

/** 课后纪要写了任意一项（本节内容、作业、下节准备）。 */
export function hasNotes(lesson: Pick<Lesson, "summaryMd" | "homework" | "prep">): boolean {
  return Boolean(lesson.summaryMd || lesson.homework || lesson.prep);
}

/** 课前计划写了任意一项（计划内容、课前准备）。 */
export function hasPlan(lesson: Pick<Lesson, "planMd" | "planPrep">): boolean {
  return Boolean(lesson.planMd || lesson.planPrep);
}
