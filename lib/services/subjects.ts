import "server-only";
import type { Subject } from "@/lib/db/schema";
import { getSubjectById, getSubjectBySlug, listSubjects } from "@/lib/queries";

/** 只接受明确的 ID、slug 或完整名称；名称对不上时返回 undefined，让调用方列出候选。 */
export function resolveSubject(ref: number | string): Subject | undefined {
  if (typeof ref === "number") return getSubjectById(ref);
  const value = ref.trim();
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return getSubjectById(Number(value));
  return (
    getSubjectBySlug(value) ?? listSubjects().find((subject) => subject.name === value)
  );
}
