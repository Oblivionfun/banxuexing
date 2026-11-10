import type { z } from "zod";

/** 把 zod 校验错误整理成"字段 → 第一条错误"，表单在对应输入框下标红。 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
