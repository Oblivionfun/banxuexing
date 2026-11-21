type Window = { count: number; resetAt: number };

const globalForMcpLimit = globalThis as unknown as { __bxxMcpLimits?: Map<string, Window> };
const limits = (globalForMcpLimit.__bxxMcpLimits ??= new Map());

const REQUEST_LIMIT = 120;
const UPLOAD_LIMIT = 30;
const WINDOW_MS = 60_000;

export function checkMcpRate(key: string, kind: "request" | "upload" = "request"): number | null {
  const max = kind === "upload" ? UPLOAD_LIMIT : REQUEST_LIMIT;
  const bucket = `${key}:${kind}`;
  const now = Date.now();
  const current = limits.get(bucket);
  if (!current || current.resetAt <= now) {
    limits.set(bucket, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count <= max) return null;
  return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
}
