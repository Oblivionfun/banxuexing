import { z } from "zod";
import { fail, ok, runMcp } from "@/lib/mcp/http";
import { proposeScheduleForWeek } from "@/lib/services/schedule";
import { resolveSubject } from "@/lib/services/subjects";
import { isDateString, todayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  weekStart: z.string().refine(isDateString, "日期要用 YYYY-MM-DD").optional(),
  requests: z
    .array(
      z.object({
        subject: z.union([z.number().int().positive(), z.string().trim().min(1)]),
        sessions: z.number().int().min(0).max(20).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(request: Request) {
  return runMcp(request, async () => {
    const raw = await request.text();
    const body = bodySchema.parse(raw ? JSON.parse(raw) : {});

    const requests: { subjectId: number; sessions: number }[] = [];
    for (const item of body.requests ?? []) {
      const subject = resolveSubject(item.subject);
      if (!subject) {
        return fail(400, "unknown_subject", `找不到科目：${item.subject}`, "先调用 list_subjects");
      }
      requests.push({ subjectId: subject.id, sessions: item.sessions ?? subject.weeklyLessons });
    }

    return ok(
      proposeScheduleForWeek(
        body.weekStart ?? todayKey(),
        body.requests ? requests : undefined,
      ),
    );
  });
}
