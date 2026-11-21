import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { UploadError } from "@/lib/storage";
import { ingestUpload, type IngestTarget } from "@/lib/services/uploads";

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

  const rawName = request.headers.get("x-file-name");
  let originalName = "未命名文件";
  if (rawName) {
    try {
      originalName = decodeURIComponent(rawName);
    } catch {
      return fail("文件名格式不正确", 400);
    }
  }

  if (!request.body) return fail("没有收到文件内容", 400);

  const target: IngestTarget = setId !== undefined ? { setId } : { lessonId: lessonId as number };
  try {
    const result = await ingestUpload({
      target,
      originalName,
      declaredSize: Number(request.headers.get("x-file-size")),
      stream: request.body,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message, error.status);
    console.error("[upload] failed", error);
    return fail("上传失败，请重试", 500);
  }
}
