import "server-only";
import { randomUUID } from "node:crypto";
import fsp from "node:fs/promises";
import { and, eq, isNull } from "drizzle-orm";
import { dataDir, getDb } from "@/lib/db";
import { files, lessons, materialSets } from "@/lib/db/schema";
import { MAX_UPLOAD_BYTES } from "@/lib/file-types";
import { getLesson, getMaterialSet, logActivity, nextFileSortOrder } from "@/lib/queries";
import { commitUpload, receiveStream, UploadError } from "@/lib/storage";
import { formatMonthDay } from "@/lib/time";

export type IngestTarget = { setId: number } | { lessonId: number };

export type IngestResult = { id: string; kind: string; duplicate: boolean };

function targetExists(target: IngestTarget): boolean {
  const db = getDb();
  const row =
    "setId" in target
      ? db
          .select({ id: materialSets.id })
          .from(materialSets)
          .where(and(eq(materialSets.id, target.setId), isNull(materialSets.deletedAt)))
          .get()
      : db
          .select({ id: lessons.id })
          .from(lessons)
          .where(and(eq(lessons.id, target.lessonId), isNull(lessons.deletedAt)))
          .get();
  return Boolean(row);
}

function targetLabel(target: IngestTarget): string {
  if ("setId" in target) {
    const found = getMaterialSet(target.setId);
    return found ? `资料册「${found.set.title}」` : `资料册 #${target.setId}`;
  }
  const found = getLesson(target.lessonId);
  return found
    ? `课程 ${found.lesson.subject.name} ${formatMonthDay(found.lesson.date)}`
    : `课程 #${target.lessonId}`;
}

/**
 * 接收一个上传并写入资料册或课程。
 * 网页上传和 MCP 上传共用，调用方只负责鉴权和解析参数。
 */
export async function ingestUpload(input: {
  target: IngestTarget;
  originalName: string;
  declaredSize: number;
  stream: ReadableStream<Uint8Array>;
  actor?: string;
}): Promise<IngestResult> {
  const { target, stream } = input;
  const actor = input.actor ?? "工作人员";
  if (!targetExists(target)) throw new UploadError("资料册或课程不存在，可能已被删除", 404);

  const originalName = input.originalName.trim().slice(0, 200) || "未命名文件";
  const declaredSize = input.declaredSize;
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    throw new UploadError("缺少文件大小信息，请刷新页面后重试", 400);
  }
  if (declaredSize > MAX_UPLOAD_BYTES) {
    throw new UploadError(`文件超过 ${MAX_UPLOAD_BYTES / 1024 / 1024} MB 上限`, 413);
  }

  const root = dataDir();
  let tmpPath: string | undefined;
  try {
    const received = await receiveStream(root, stream, MAX_UPLOAD_BYTES);
    tmpPath = received.tmpPath;
    if (received.size !== declaredSize) {
      throw new UploadError("文件没有传完整，请重试", 400);
    }

    const db = getDb();
    const duplicate = db
      .select({ id: files.id, kind: files.kind })
      .from(files)
      .where(
        and(
          eq(files.sha256, received.sha256),
          isNull(files.deletedAt),
          "setId" in target ? eq(files.setId, target.setId) : eq(files.lessonId, target.lessonId),
        ),
      )
      .get();

    const blob = await commitUpload(root, received, originalName);
    if (duplicate) {
      return { id: duplicate.id, kind: duplicate.kind, duplicate: true };
    }

    const id = randomUUID();
    db.transaction((tx) => {
      tx.insert(files)
        .values({
          id,
          setId: "setId" in target ? target.setId : null,
          lessonId: "lessonId" in target ? target.lessonId : null,
          originalName,
          mime: blob.mime,
          size: blob.size,
          sha256: blob.sha256,
          kind: blob.kind,
          width: blob.width,
          height: blob.height,
          sortOrder: nextFileSortOrder(target),
        })
        .run();
      if ("setId" in target) {
        tx.update(materialSets)
          .set({ updatedAt: new Date() })
          .where(eq(materialSets.id, target.setId))
          .run();
      } else {
        tx.update(lessons)
          .set({ updatedAt: new Date() })
          .where(eq(lessons.id, target.lessonId))
          .run();
      }
    });

    logActivity({
      action: "file.upload",
      entityType: "file",
      entityId: id,
      summary: `上传文件：${originalName} → ${targetLabel(target)}`,
      actor,
    });

    return { id, kind: blob.kind, duplicate: false };
  } finally {
    if (tmpPath) await fsp.rm(tmpPath, { force: true });
  }
}
