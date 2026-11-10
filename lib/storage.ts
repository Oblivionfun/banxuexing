import "server-only";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileTypeFromFile } from "file-type";
import sharp from "sharp";
import type { FileKind } from "@/lib/db/schema";
import { resolveFileType } from "@/lib/file-types";

sharp.cache({ memory: 64, files: 0 });

export type Variant = "original" | "preview" | "thumb";

export type StoredBlob = {
  sha256: string;
  size: number;
  mime: string;
  kind: FileKind;
  width: number | null;
  height: number | null;
};

export type ReceivedUpload = { tmpPath: string; sha256: string; size: number };

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

const PREVIEW_EDGE = 1600;
const THUMB_EDGE = 480;

export function blobPath(root: string, sha256: string, variant: Variant): string {
  const shard = sha256.slice(0, 2);
  switch (variant) {
    case "original":
      return path.join(root, "uploads", "originals", shard, sha256);
    case "preview":
      return path.join(root, "uploads", "previews", shard, `${sha256}.webp`);
    case "thumb":
      return path.join(root, "uploads", "thumbs", shard, `${sha256}.webp`);
    default: {
      const unreachable: never = variant;
      return unreachable;
    }
  }
}

function tmpDir(root: string): string {
  return path.join(root, "tmp");
}

async function exists(file: string): Promise<boolean> {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

/** 先写到临时文件再 rename：要么完整落盘，要么不出现。 */
async function moveIntoPlace(tmpPath: string, finalPath: string): Promise<void> {
  await fsp.mkdir(path.dirname(finalPath), { recursive: true });
  if (await exists(finalPath)) {
    await fsp.rm(tmpPath, { force: true });
    return;
  }
  await fsp.rename(tmpPath, finalPath);
}

/** 流式接收上传内容，边写边算 sha256，超过上限立即中止。 */
export async function receiveStream(
  root: string,
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<ReceivedUpload> {
  await fsp.mkdir(tmpDir(root), { recursive: true });
  const tmpPath = path.join(tmpDir(root), `${randomUUID()}.part`);
  const handle = await fsp.open(tmpPath, "w");
  const hash = createHash("sha256");
  let size = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        throw new UploadError(`文件超过 ${Math.round(maxBytes / 1024 / 1024)} MB 上限`, 413);
      }
      hash.update(value);
      await handle.write(value);
    }
    await handle.sync();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    await handle.close();
    await fsp.rm(tmpPath, { force: true });
    throw error;
  }
  await handle.close();
  if (size === 0) {
    await fsp.rm(tmpPath, { force: true });
    throw new UploadError("文件是空的", 400);
  }
  return { tmpPath, sha256: hash.digest("hex"), size };
}

async function writeDerivative(
  root: string,
  source: string,
  target: string,
  edge: number,
  quality: number,
): Promise<{ width: number; height: number }> {
  await fsp.mkdir(tmpDir(root), { recursive: true });
  const tmp = path.join(tmpDir(root), `${randomUUID()}.webp`);
  const info = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toFile(tmp);
  await moveIntoPlace(tmp, target);
  return { width: info.width, height: info.height };
}

/** 生成预览图和缩略图（已存在则跳过），返回预览图尺寸。 */
export async function ensureImageDerivatives(
  root: string,
  sha256: string,
): Promise<{ width: number; height: number }> {
  const original = blobPath(root, sha256, "original");
  const preview = blobPath(root, sha256, "preview");
  const thumb = blobPath(root, sha256, "thumb");

  let dims: { width: number; height: number };
  if (await exists(preview)) {
    const meta = await sharp(preview).metadata();
    dims = { width: meta.width ?? 0, height: meta.height ?? 0 };
  } else {
    dims = await writeDerivative(root, original, preview, PREVIEW_EDGE, 80);
  }
  if (!(await exists(thumb))) {
    await writeDerivative(root, original, thumb, THUMB_EDGE, 72);
  }
  return dims;
}

/** 按内容嗅探类型，存入以 sha256 命名的位置；图片同时生成预览图。 */
export async function commitUpload(
  root: string,
  received: ReceivedUpload,
  originalName: string,
): Promise<StoredBlob> {
  const sniffed = await fileTypeFromFile(received.tmpPath);
  const resolved = resolveFileType(sniffed, originalName);
  if (!resolved) {
    await fsp.rm(received.tmpPath, { force: true });
    throw new UploadError("不支持这种文件。可以上传图片、PDF、Word/Excel/PPT、录音或文本文件。", 415);
  }

  await moveIntoPlace(received.tmpPath, blobPath(root, received.sha256, "original"));

  let kind = resolved.kind;
  let width: number | null = null;
  let height: number | null = null;
  if (kind === "image") {
    try {
      const dims = await ensureImageDerivatives(root, received.sha256);
      width = dims.width;
      height = dims.height;
    } catch {
      kind = "other";
    }
  }

  return { sha256: received.sha256, size: received.size, mime: resolved.mime, kind, width, height };
}

/** 把内存中的文件按上传同样的流程存入（用于写入演示数据）。 */
export async function storeBuffer(root: string, buffer: Buffer, originalName: string): Promise<StoredBlob> {
  await fsp.mkdir(tmpDir(root), { recursive: true });
  const tmpPath = path.join(tmpDir(root), `${randomUUID()}.part`);
  await fsp.writeFile(tmpPath, buffer);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return commitUpload(root, { tmpPath, sha256, size: buffer.length }, originalName);
}

/** 彻底删除内容文件（调用方需先确认已无记录引用）。 */
export async function removeBlob(root: string, sha256: string): Promise<void> {
  await Promise.all(
    (["original", "preview", "thumb"] as const).map((variant) =>
      fsp.rm(blobPath(root, sha256, variant), { force: true }),
    ),
  );
}

export function openRead(file: string, range?: { start: number; end: number }): fs.ReadStream {
  return fs.createReadStream(file, range);
}

/** 清理超过一天的残留临时文件（上传中断时会留下）。 */
export async function cleanTmp(root: string, olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
  const dir = tmpDir(root);
  if (!(await exists(dir))) return 0;
  const entries = await fsp.readdir(dir);
  let removed = 0;
  const now = Date.now();
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = await fsp.stat(full).catch(() => null);
    if (stat && now - stat.mtimeMs > olderThanMs) {
      await fsp.rm(full, { force: true });
      removed += 1;
    }
  }
  return removed;
}
