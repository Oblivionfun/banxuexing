import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dataDir } from "@/lib/db";
import { contentDisposition } from "@/lib/file-types";
import { getFile } from "@/lib/queries";
import { blobPath, ensureImageDerivatives, openRead, type Variant } from "@/lib/storage";

export const dynamic = "force-dynamic";

function parseVariant(value: string | null): Variant {
  return value === "thumb" || value === "preview" ? value : "original";
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!suffix) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const file = getFile(id);
  if (!file || (file.deletedAt && !(await isAdmin()))) {
    return NextResponse.json({ error: "文件不存在或已被删除" }, { status: 404 });
  }

  const variant = parseVariant(request.nextUrl.searchParams.get("v"));
  if (variant !== "original" && file.kind !== "image") {
    return NextResponse.json({ error: "这个文件没有预览图" }, { status: 404 });
  }

  const root = dataDir();
  const filePath = blobPath(root, file.sha256, variant);
  let stat = await fsp.stat(filePath).catch(() => null);
  if (!stat && variant !== "original") {
    await ensureImageDerivatives(root, file.sha256).catch(() => undefined);
    stat = await fsp.stat(filePath).catch(() => null);
  }
  if (!stat) {
    console.error("[files] blob missing", file.id, variant);
    return NextResponse.json({ error: "文件内容缺失，请联系工作人员重新上传" }, { status: 410 });
  }

  const etag = `"${file.sha256.slice(0, 20)}-${variant}"`;
  const baseHeaders: Record<string, string> = {
    ETag: etag,
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: baseHeaders });
  }

  const download = request.nextUrl.searchParams.get("dl") === "1";
  const contentType = variant === "original" ? file.mime : "image/webp";
  const headers: Record<string, string> = { ...baseHeaders, "Content-Type": contentType };
  if (variant === "original") {
    headers["Content-Disposition"] = contentDisposition(
      download ? "attachment" : "inline",
      file.originalName,
    );
  }

  const range = variant === "original" ? parseRange(request.headers.get("range"), stat.size) : null;
  if (request.headers.get("range") && variant === "original" && !range) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${stat.size}` },
    });
  }

  if (range) {
    const stream = openRead(filePath, range);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
        "Content-Length": String(range.end - range.start + 1),
      },
    });
  }

  const stream = openRead(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}
