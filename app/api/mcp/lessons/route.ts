import { z } from "zod";
import { fail, ok, runMcp } from "@/lib/mcp/http";
import { getLesson, listLessonsBetween } from "@/lib/queries";
import { findOverlap, LessonConflictError } from "@/lib/services/lessons";
import { applyScheduleSlots } from "@/lib/services/schedule";
import { resolveSubject } from "@/lib/services/subjects";
import { addDays, isDateString, isTimeString, todayKey, toMinutes } from "@/lib/time";
import type { ProposedSlot } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

const subjectRef = z.union([z.number().int().positive(), z.string().trim().min(1)]);

export async function GET(request: Request) {
  return runMcp(request, () => {
    const params = new URL(request.url).searchParams;
    const idValue = params.get("id");
    if (idValue) {
      const id = Number(idValue);
      const found = Number.isInteger(id) && id > 0 ? getLesson(id) : undefined;
      if (!found) return fail(404, "lesson_not_found", "这节课不存在，可能已被删除");
      return ok({
        ...found.lesson,
        files: found.files.map((file) => ({
          id: file.id,
          name: file.originalName,
          kind: file.kind,
          size: file.size,
        })),
      });
    }

    const today = todayKey();
    const from = params.get("from") ?? today;
    const to = params.get("to") ?? addDays(today, 7);
    if (!isDateString(from) || !isDateString(to)) {
      return fail(400, "invalid_date", "日期要用 YYYY-MM-DD");
    }

    let subjectId: number | undefined;
    const subjectValue = params.get("subject");
    if (subjectValue) {
      const subject = resolveSubject(/^\d+$/.test(subjectValue) ? Number(subjectValue) : subjectValue);
      if (!subject) return fail(400, "unknown_subject", "找不到这个科目", "先调用 list_subjects");
      subjectId = subject.id;
    }

    return ok(
      listLessonsBetween(from, to)
        .filter((lesson) => !subjectId || lesson.subjectId === subjectId)
        .map((lesson) => ({
          id: lesson.id,
          subject: { id: lesson.subject.id, name: lesson.subject.name },
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          status: lesson.status,
          topic: lesson.topic,
        })),
    );
  });
}

const slotSchema = z
  .object({
    subject: subjectRef,
    date: z.string().refine(isDateString, "日期要用 YYYY-MM-DD"),
    startTime: z.string().refine(isTimeString, "时间要用 HH:mm"),
    endTime: z.string().refine(isTimeString, "时间要用 HH:mm"),
  })
  .refine((slot) => toMinutes(slot.endTime) > toMinutes(slot.startTime), {
    message: "结束时间要晚于开始时间",
  });

const bodySchema = z.object({
  slots: z.array(slotSchema).min(1).max(80),
  confirm: z.literal(true, { message: "请先让工作人员确认，再传 confirm: true" }),
  allowOverlap: z.boolean().optional(),
});

export async function POST(request: Request) {
  return runMcp(request, async (actor) => {
    const body = bodySchema.parse(await request.json());
    const slots: ProposedSlot[] = [];
    for (const item of body.slots) {
      const subject = resolveSubject(item.subject);
      if (!subject) {
        return fail(400, "unknown_subject", `找不到科目：${item.subject}`, "先调用 list_subjects");
      }
      slots.push({
        subjectId: subject.id,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
      });
    }

    if (!body.allowOverlap) {
      for (const slot of slots) {
        const conflict = findOverlap(slot.date, slot.startTime, slot.endTime);
        if (conflict) throw new LessonConflictError(conflict);
      }
    }

    const result = applyScheduleSlots(slots, { actor, allowOverlap: body.allowOverlap });
    return ok(result);
  });
}
