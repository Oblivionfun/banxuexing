import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LessonConflictError } from "@/lib/services/lessons";
import { UploadError } from "@/lib/storage";
import { authorizeMcp, McpAuthError } from "./auth";
import { checkMcpRate } from "./rate-limit";

export function ok(data: unknown): NextResponse {
  return NextResponse.json({ ok: true, data });
}

export function fail(status: number, code: string, message: string, hint?: unknown): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, ...(hint ? { hint } : {}) } }, { status });
}

function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "参数不正确";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** 统一处理鉴权、限流和错误；路由只写业务。 */
export async function runMcp(
  request: Request,
  handler: (actor: string) => Promise<Response> | Response,
  { upload = false }: { upload?: boolean } = {},
): Promise<Response> {
  try {
    const { actor, key } = authorizeMcp(request);
    const retryAfter = checkMcpRate(key, upload ? "upload" : "request");
    if (retryAfter !== null) {
      const response = fail(429, "rate_limited", `请求太频繁，${retryAfter} 秒后再试`);
      response.headers.set("Retry-After", String(retryAfter));
      return response;
    }
    return await handler(actor);
  } catch (error) {
    if (error instanceof McpAuthError) return fail(error.status, "unauthorized", error.message);
    if (error instanceof UploadError) return fail(error.status, "upload_failed", error.message);
    if (error instanceof LessonConflictError) {
      return fail(409, "time_conflict", error.message, error.conflict);
    }
    if (error instanceof ZodError) return fail(400, "invalid_input", zodMessage(error));
    if (error instanceof SyntaxError) return fail(400, "invalid_json", "请求体不是合法 JSON");
    if (error instanceof Error && error.message === "科目不存在，请刷新页面") {
      return fail(400, "unknown_subject", error.message, "先调用 list_subjects 获取科目 ID");
    }
    console.error("[mcp] failed", error);
    return fail(500, "internal_error", "服务器处理失败，请稍后再试");
  }
}
