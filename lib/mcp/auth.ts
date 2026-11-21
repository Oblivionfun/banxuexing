import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export class McpAuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "McpAuthError";
  }
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function sameToken(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** 返回审计用的 actor 和限流用的键；令牌本身不进入日志。 */
export function authorizeMcp(request: Request): { actor: string; key: string } {
  const env = getEnv();
  if (!env.MCP_TOKEN) throw new McpAuthError(503, "MCP 还没有启用");
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !sameToken(match[1].trim(), env.MCP_TOKEN)) {
    throw new McpAuthError(401, "令牌不正确");
  }
  const label = env.MCP_TOKEN_LABEL?.trim() || "MCP";
  return { actor: `AI（${label}）`, key: digest(env.MCP_TOKEN).toString("hex") };
}
