import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { getEnv, type Env } from "@/lib/env";

export type McpTokenEntry = { label: string; token: string };

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

/** 单个 MCP_TOKEN 兼容旧配置；MCP_TOKENS 给多人分别发令牌。 */
export function parseMcpTokens(
  env: Pick<Env, "MCP_TOKEN" | "MCP_TOKEN_LABEL" | "MCP_TOKENS">,
): McpTokenEntry[] {
  const entries: McpTokenEntry[] = [];
  if (env.MCP_TOKEN) {
    entries.push({ label: env.MCP_TOKEN_LABEL?.trim() || "MCP", token: env.MCP_TOKEN });
  }
  for (const part of (env.MCP_TOKENS ?? "").split(",")) {
    const value = part.trim();
    if (!value) continue;
    const split = value.indexOf(":");
    if (split <= 0) continue;
    const label = value.slice(0, split).trim();
    const token = value.slice(split + 1).trim();
    if (label && token.length >= 32) entries.push({ label, token });
  }
  return entries;
}

/** 返回审计用的 actor 和限流用的键；令牌本身不进入日志。 */
export function authorizeMcp(request: Request): { actor: string; key: string } {
  const env = getEnv();
  const entries = parseMcpTokens(env);
  if (entries.length === 0) throw new McpAuthError(503, "MCP 还没有启用");
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const presented = match?.[1].trim();
  if (!presented) throw new McpAuthError(401, "令牌不正确");

  let matched: McpTokenEntry | undefined;
  for (const entry of entries) {
    if (sameToken(presented, entry.token)) matched = entry;
  }
  if (!matched) throw new McpAuthError(401, "令牌不正确");
  return { actor: `AI（${matched.label}）`, key: digest(presented).toString("hex") };
}
