import { createReadStream } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

const baseUrl = (process.env.BXX_BASE_URL ?? "http://127.0.0.1:3310").replace(/\/+$/, "");
const token = process.env.BXX_MCP_TOKEN?.trim();

export class ToolError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

function authHeaders(): Record<string, string> {
  if (!token) throw new ToolError("没有配置 BXX_MCP_TOKEN", "在 MCP 配置里填入服务器 .env 的 MCP_TOKEN");
  return { Authorization: `Bearer ${token}` };
}

export async function api<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value);
  const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: T; error?: { message?: string; hint?: unknown } }
    | null;
  if (!response.ok || !body?.ok) {
    const hint = body?.error?.hint;
    throw new ToolError(
      body?.error?.message ?? `请求失败（HTTP ${response.status}）`,
      hint === undefined ? undefined : typeof hint === "string" ? hint : JSON.stringify(hint, null, 2),
    );
  }
  return body.data as T;
}

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

async function allowedRoots(): Promise<string[]> {
  const raw = (process.env.BXX_UPLOAD_ROOTS ?? "")
    .split(path.delimiter)
    .map((value) => value.trim())
    .filter(Boolean);
  if (raw.length === 0) {
    throw new ToolError(
      "没有配置 BXX_UPLOAD_ROOTS",
      "在 MCP 配置里写允许读取的目录，例如 ~/Desktop:~/Downloads",
    );
  }
  return Promise.all(raw.map(async (value) => realpath(expandHome(value))));
}

export async function assertAllowed(target: string): Promise<string> {
  const roots = await allowedRoots();
  const resolved = await realpath(path.resolve(target)).catch(() => {
    throw new ToolError(`找不到文件或文件夹：${target}`);
  });
  const allowed = roots.some(
    (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`),
  );
  if (!allowed) {
    throw new ToolError(`只能读取这些目录里的文件：${roots.join("、")}`);
  }
  return resolved;
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "test-results", "playwright-report"]);

export type ScannedFile = {
  path: string;
  name: string;
  size: number;
  extension: string;
  modifiedAt: string;
};

export async function scanFolder(
  target: string,
  { recursive = false, extensions }: { recursive?: boolean; extensions?: string[] } = {},
): Promise<ScannedFile[]> {
  const root = await assertAllowed(target);
  const info = await stat(root);
  if (!info.isDirectory()) throw new ToolError(`这不是文件夹：${root}`);

  const wanted = extensions?.map((value) => value.toLowerCase().replace(/^\./, ""));
  const found: ScannedFile[] = [];

  async function walk(dir: string) {
    if (found.length >= 300) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (found.length >= 300) return;
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive && !SKIP_DIRS.has(entry.name)) await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase().replace(/^\./, "");
      if (wanted && wanted.length > 0 && !wanted.includes(extension)) continue;
      const fileInfo = await stat(full);
      found.push({
        path: full,
        name: entry.name,
        size: fileInfo.size,
        extension,
        modifiedAt: fileInfo.mtime.toISOString(),
      });
    }
  }

  await walk(root);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

export type UploadTarget = { setId?: number; lessonId?: number };

export async function uploadFile(target: UploadTarget, filePath: string) {
  const resolved = await assertAllowed(filePath);
  const info = await stat(resolved);
  if (!info.isFile()) throw new ToolError(`这不是文件：${resolved}`);
  if (info.size <= 0) throw new ToolError(`文件是空的：${resolved}`);
  if (info.size > 100 * 1024 * 1024) throw new ToolError(`文件超过 100 MB：${resolved}`);

  const query = target.setId ? `setId=${target.setId}` : `lessonId=${target.lessonId}`;
  const body = Readable.toWeb(createReadStream(resolved)) as ReadableStream<Uint8Array>;
  const response = await fetch(`${baseUrl}/api/mcp/uploads?${query}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "content-type": "application/octet-stream",
      "x-file-name": encodeURIComponent(path.basename(resolved)),
      "x-file-size": String(info.size),
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: unknown; error?: { message?: string; hint?: unknown } }
    | null;
  if (!response.ok || !result?.ok) {
    throw new ToolError(
      result?.error?.message ?? `上传失败（HTTP ${response.status}）`,
      typeof result?.error?.hint === "string" ? result.error.hint : undefined,
    );
  }
  return { path: resolved, name: path.basename(resolved), size: info.size, data: result.data };
}

export async function ensureMaterialSet(input: {
  subject: string | number;
  category: string;
  title?: string;
}) {
  return api<{ id: number; created: boolean; title: string; subject: string }>(
    "/api/mcp/material-sets",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export async function getContext() {
  const context = await api<Record<string, unknown>>("/api/mcp/context");
  const roots = await allowedRoots().catch(() => []);
  return { ...context, uploadRoots: roots, uploadConfigured: roots.length > 0 };
}
