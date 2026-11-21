import { z } from "zod";
import { MATERIAL_CATEGORIES } from "@/lib/enums";
import { fail, ok, runMcp } from "@/lib/mcp/http";
import { listMaterialSets } from "@/lib/queries";
import { ensureMaterialSet } from "@/lib/services/materials";
import { resolveSubject } from "@/lib/services/subjects";

export const dynamic = "force-dynamic";

const subjectRef = z.union([z.number().int().positive(), z.string().trim().min(1)]);
const category = z.enum(MATERIAL_CATEGORIES, { message: "类别不正确" });

export async function GET(request: Request) {
  return runMcp(request, () => {
    const params = new URL(request.url).searchParams;
    const subjectRefValue = params.get("subject");
    let subjectId: number | undefined;
    if (subjectRefValue) {
      const subject = resolveSubject(
        /^\d+$/.test(subjectRefValue) ? Number(subjectRefValue) : subjectRefValue,
      );
      if (!subject) return fail(400, "unknown_subject", "找不到这个科目", "先调用 list_subjects");
      subjectId = subject.id;
    }
    const categoryValue = params.get("category");
    if (categoryValue && !MATERIAL_CATEGORIES.includes(categoryValue as (typeof MATERIAL_CATEGORIES)[number])) {
      return fail(400, "invalid_category", "类别不正确");
    }

    return ok(
      listMaterialSets(subjectId)
        .filter((set) => !categoryValue || set.category === categoryValue)
        .map((set) => ({
          id: set.id,
          subject: { id: set.subject.id, name: set.subject.name },
          category: set.category,
          title: set.title,
          note: set.note,
          fileCount: set.fileCount,
          createdAt: set.createdAt,
        })),
    );
  });
}

export async function POST(request: Request) {
  return runMcp(request, async (actor) => {
    const body = z
      .object({
        subject: subjectRef,
        category,
        title: z.string().trim().max(80, "标题最多 80 字").optional(),
        note: z.string().trim().max(1000, "备注最多 1000 字").optional(),
      })
      .parse(await request.json());

    const subject = resolveSubject(body.subject);
    if (!subject) return fail(400, "unknown_subject", "找不到这个科目", "先调用 list_subjects");

    const result = ensureMaterialSet(
      {
        subjectId: subject.id,
        category: body.category,
        title: body.title,
        note: body.note,
      },
      { actor },
    );
    return ok({ ...result, subject: subject.name });
  });
}
