import { ok, runMcp } from "@/lib/mcp/http";
import { listSubjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runMcp(request, () =>
    ok(
      listSubjects().map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        teacher: subject.teacherName,
        weeklyLessons: subject.weeklyLessons,
        lessonMinutes: subject.lessonMinutes,
      })),
    ),
  );
}
