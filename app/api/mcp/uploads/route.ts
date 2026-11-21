import { fail, ok, runMcp } from "@/lib/mcp/http";
import { ingestUpload, type IngestTarget } from "@/lib/services/uploads";

export const dynamic = "force-dynamic";

function parseId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export async function POST(request: Request) {
  return runMcp(
    request,
    async (actor) => {
      const params = new URL(request.url).searchParams;
      const setId = parseId(params.get("setId"));
      const lessonId = parseId(params.get("lessonId"));
      if ((setId === undefined) === (lessonId === undefined)) {
        return fail(400, "invalid_target", "请指定 setId 或 lessonId，只能选一个");
      }

      const rawName = request.headers.get("x-file-name");
      let originalName = "未命名文件";
      if (rawName) {
        try {
          originalName = decodeURIComponent(rawName);
        } catch {
          return fail(400, "invalid_name", "文件名格式不正确");
        }
      }

      if (!request.body) return fail(400, "empty_body", "没有收到文件内容");

      const target: IngestTarget = setId !== undefined ? { setId } : { lessonId: lessonId as number };
      const result = await ingestUpload({
        target,
        originalName,
        declaredSize: Number(request.headers.get("x-file-size")),
        stream: request.body,
        actor,
      });
      return ok(result);
    },
    { upload: true },
  );
}
