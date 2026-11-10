import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dataDir, getDb } from "@/lib/db";
import { files, lessons, materialSets } from "@/lib/db/schema";
import { MAX_UPLOAD_BYTES } from "@/lib/file-types";
import { nextFileSortOrder } from "@/lib/queries";
import { UploadError, commitUpload, receiveStream } from "@/lib/storage";

export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return fail("需要管理口令", 401);

  const params = request.nextUrl.searchParams;
  const setId = parseId(params.get("setId"));
  const lessonId = parseId(params.get("lessonId"));
  if ((setId === undefined) === (lessonId === undefined)) {
    return fail("请指定要上传到的资料册或课程", 400);
  }

  const db = getDb();
  const target =
    setId !== undefined
      ? db
          .select({ id: materialSets.id })
          .from(materialSets)
          .where(and(eq(materialSets.id, setId), isNull(materialSets.deletedAt)))
          .get()
      : db
          .select({ id: lessons.id })
          .from(lessons)
          .where(and(eq(lessons.id, lessonId as number), isNull(lessons.deletedAt)))
          .get();
  if (!target) return fail("资料册或课程不存在，可能已被删除", 404);

  const rawName = request.headers.get("x-file-name");
  let originalName = "未命名文件";
  if (rawName) {
    try {
      originalName = decodeURIComponent(rawName).slice(0, 200) || originalName;
    } catch {
      return fail("文件名格式不正确", 400);
    }
  }

  const declaredSize = Number(request.headers.get("x-file-size"));
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    return fail("缺少文件大小信息，请刷新页面后重试", 400);
  }
  if (declaredSize > MAX_UPLOAD_BYTES) {
    return fail(`文件超过 ${MAX_UPLOAD_BYTES / 1024 / 1024} MB 上限`, 413);
  }
  if (!request.body) return fail("没有收到文件内容", 400);

  const root = dataDir();
  let tmpPath: string | undefined;
  try {
    const received = await receiveStream(root, request.body, MAX_UPLOAD_BYTES);
    tmpPath = received.tmpPath;
    if (received.size !== declaredSize) {
      throw new UploadError("文件没有传完整，请重试", 400);
    }

    const duplicate = db
      .select({ id: files.id, kind: files.kind })
      .from(files)
      .where(
        and(
          eq(files.sha256, received.sha256),
          isNull(files.deletedAt),
          setId !== undefined ? eq(files.setId, setId) : eq(files.lessonId, lessonId as number),
        ),
      )
      .get();

    const blob = await commitUpload(root, received, originalName);
    if (duplicate) {
      return NextResponse.json({ id: duplicate.id, kind: duplicate.kind, duplicate: true });
    }

    const id = randomUUID();
    db.transaction((tx) => {
      tx.insert(files)
        .values({
          id,
          setId: setId ?? null,
          lessonId: lessonId ?? null,
          originalName,
          mime: blob.mime,
          size: blob.size,
          sha256: blob.sha256,
          kind: blob.kind,
          width: blob.width,
          height: blob.height,
          sortOrder: nextFileSortOrder(setId !== undefined ? { setId } : { lessonId }),
        })
        .run();
      if (setId !== undefined) {
        tx.update(materialSets).set({ updatedAt: new Date() }).where(eq(materialSets.id, setId)).run();
      } else {
        tx.update(lessons)
          .set({ updatedAt: new Date() })
          .where(eq(lessons.id, lessonId as number))
          .run();
      }
    });

    return NextResponse.json({ id, kind: blob.kind, duplicate: false });
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message, error.status);
    console.error("[upload] failed", error);
    return fail("上传失败，请重试", 500);
  } finally {
    if (tmpPath) await fsp.rm(tmpPath, { force: true });
  }
}
