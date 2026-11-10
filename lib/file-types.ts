import type { FileKind } from "@/lib/db/schema";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type ResolvedType = { mime: string; kind: FileKind };

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOWNLOAD_ONLY_IMAGE_MIMES = new Set(["image/heic", "image/heif"]);
const AUDIO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/ogg",
]);
const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const LEGACY_OFFICE_BY_EXT: Record<string, string> = {
  ".doc": "application/msword",
  ".xls": "application/vnd.ms-excel",
  ".ppt": "application/vnd.ms-powerpoint",
  ".wps": "application/vnd.ms-works",
};
const PLAIN_TEXT_BY_EXT: Record<string, string> = {
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export function extensionOf(name: string): string {
  const match = /\.[^./\\]+$/.exec(name.trim().toLowerCase());
  return match ? match[0] : "";
}

/**
 * 以文件内容嗅探的结果为准判断类型，扩展名只用来区分内容无法区分的旧版 Office 和纯文本。
 * 返回 null 表示不接受这个文件。
 */
export function resolveFileType(
  sniffed: { mime: string } | undefined,
  originalName: string,
): ResolvedType | null {
  const ext = extensionOf(originalName);

  if (!sniffed) {
    const textMime = PLAIN_TEXT_BY_EXT[ext];
    return textMime ? { mime: textMime, kind: "doc" } : null;
  }

  const { mime } = sniffed;
  if (IMAGE_MIMES.has(mime)) return { mime, kind: "image" };
  if (DOWNLOAD_ONLY_IMAGE_MIMES.has(mime)) return { mime, kind: "other" };
  if (mime === "application/pdf") return { mime, kind: "pdf" };
  if (OFFICE_MIMES.has(mime)) return { mime, kind: "doc" };
  if (mime === "application/x-cfb" && LEGACY_OFFICE_BY_EXT[ext]) {
    return { mime: LEGACY_OFFICE_BY_EXT[ext], kind: "doc" };
  }
  if (AUDIO_MIMES.has(mime)) return { mime, kind: "audio" };
  if (mime === "application/zip" && ext === ".zip") return { mime, kind: "other" };
  return null;
}

export const ACCEPT_ATTRIBUTE = [
  "image/*",
  "application/pdf",
  ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.wps",
  ".txt,.md,.csv,.zip",
  "audio/*",
].join(",");

/** 用于 Content-Disposition 的安全文件名，保留中文。 */
export function sanitizeFileName(name: string, fallback = "file"): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .slice(0, 160);
  return cleaned || fallback;
}

export function contentDisposition(type: "inline" | "attachment", name: string): string {
  const safe = sanitizeFileName(name);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}
