import fs from "node:fs";
import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { NextResponse, type NextRequest } from "next/server";
import { dataDir } from "@/lib/db";
import { contentDisposition, extensionOf, sanitizeFileName } from "@/lib/file-types";
import { getMaterialSet } from "@/lib/queries";
import { blobPath } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/materials/[id]/zip">) {
  const { id } = await ctx.params;
  const found = getMaterialSet(Number(id));
  if (!found || found.files.length === 0) {
    return NextResponse.json({ error: "资料册不存在或没有文件" }, { status: 404 });
  }

  const root = dataDir();
  const available = found.files.filter((file) =>
    fs.existsSync(blobPath(root, file.sha256, "original")),
  );
  if (available.length === 0) {
    return NextResponse.json({ error: "文件内容缺失，请联系工作人员" }, { status: 410 });
  }

  const archive = new ZipArchive({ store: true });
  const output = new PassThrough();
  archive.on("error", (error) => {
    console.error("[zip] failed", error);
    output.destroy(error);
  });
  archive.pipe(output);

  const width = String(available.length).length;
  const used = new Set<string>();
  available.forEach((file, index) => {
    let name = `${String(index + 1).padStart(Math.max(2, width), "0")}-${sanitizeFileName(file.originalName)}`;
    if (!extensionOf(name) && file.kind === "image") name += ".jpg";
    while (used.has(name)) name = `_${name}`;
    used.add(name);
    archive.append(fs.createReadStream(blobPath(root, file.sha256, "original")), {
      name,
      date: file.createdAt,
    });
  });
  void archive.finalize();

  const title = `${found.subject.name}-${found.set.title}.zip`;
  return new NextResponse(Readable.toWeb(output) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition("attachment", title),
      "Cache-Control": "private, no-store",
    },
  });
}
