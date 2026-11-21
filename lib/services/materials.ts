import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { STUDENT_ID, getDb } from "@/lib/db";
import { materialSets } from "@/lib/db/schema";
import { MATERIAL_CATEGORIES } from "@/lib/enums";
import { materialCategoryLabel } from "@/lib/labels";
import { getSubjectById, logActivity } from "@/lib/queries";
import { formatMonthDay, todayKey } from "@/lib/time";

export const materialSetInputSchema = z.object({
  subjectId: z.coerce.number().int().positive("请选择科目"),
  category: z.enum(MATERIAL_CATEGORIES, { message: "请选择类别" }),
  title: z.string().trim().min(1, "请填写标题").max(80, "标题最多 80 字"),
  note: z.string().trim().max(1000, "备注最多 1000 字"),
});

export type MaterialSetInput = z.infer<typeof materialSetInputSchema>;

export function defaultMaterialSetTitle(subjectId: number, category: MaterialSetInput["category"]): string {
  const subject = getSubjectById(subjectId);
  return `${subject?.name ?? "资料"}${materialCategoryLabel(category)} ${formatMonthDay(todayKey())}`;
}

export function createMaterialSet(
  input: MaterialSetInput,
  { actor = "工作人员" }: { actor?: string } = {},
): { id: number } {
  const parsed = materialSetInputSchema.parse(input);
  const subject = getSubjectById(parsed.subjectId);
  if (!subject) throw new Error("科目不存在，请刷新页面");

  const row = getDb()
    .insert(materialSets)
    .values({ studentId: STUDENT_ID, ...parsed })
    .returning({ id: materialSets.id })
    .get();

  logActivity({
    action: "material.create",
    entityType: "material_set",
    entityId: row.id,
    summary: `新建资料册：${subject.name} ${materialCategoryLabel(parsed.category)}「${parsed.title}」`,
    actor,
  });
  return { id: row.id };
}

/** AI 上传时优先复用同名资料册，避免一次需求建出一堆同名册。 */
export function ensureMaterialSet(
  input: {
    subjectId: number;
    category: MaterialSetInput["category"];
    title?: string;
    note?: string;
  },
  { actor = "工作人员" }: { actor?: string } = {},
): { id: number; created: boolean; title: string } {
  const subject = getSubjectById(input.subjectId);
  if (!subject) throw new Error("科目不存在，请刷新页面");
  const title = input.title?.trim() || defaultMaterialSetTitle(input.subjectId, input.category);

  const existing = getDb()
    .select({ id: materialSets.id })
    .from(materialSets)
    .where(
      and(
        eq(materialSets.subjectId, input.subjectId),
        eq(materialSets.category, input.category),
        eq(materialSets.title, title),
        isNull(materialSets.deletedAt),
      ),
    )
    .get();
  if (existing) return { id: existing.id, created: false, title };

  const result = createMaterialSet(
    { subjectId: input.subjectId, category: input.category, title, note: input.note ?? "" },
    { actor },
  );
  return { id: result.id, created: true, title };
}
