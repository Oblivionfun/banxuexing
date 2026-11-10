"use server";

import { structureWithAi } from "@/lib/ai";
import { requireAdmin } from "@/lib/auth";
import { isAiConfigured } from "@/lib/env";
import { getSubjectById } from "@/lib/queries";
import { parseTeacherSummary, type StructuredSummary } from "@/lib/summary-parser";

export type StructureResult =
  | { ok: true; result: StructuredSummary; engine: "ai" | "rules"; note?: string }
  | { ok: false; error: string };

export async function structureSummaryAction(
  raw: string,
  subjectId?: number,
): Promise<StructureResult> {
  await requireAdmin();
  const text = raw.trim();
  if (!text) return { ok: false, error: "请先粘贴老师发来的总结" };
  if (text.length > 8000) return { ok: false, error: "内容太长了，请分几次整理" };

  if (isAiConfigured()) {
    try {
      const subject = subjectId ? getSubjectById(subjectId) : undefined;
      const result = await structureWithAi(text, subject?.name);
      return { ok: true, result, engine: "ai" };
    } catch (error) {
      console.error("[ai] structure failed, falling back to rules", error);
      return {
        ok: true,
        result: parseTeacherSummary(text),
        engine: "rules",
        note: "大模型暂时不可用，已按规则拆分，请检查一下",
      };
    }
  }
  return { ok: true, result: parseTeacherSummary(text), engine: "rules" };
}
