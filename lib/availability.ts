import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { logActivity } from "@/lib/queries";
import { isTimeString, toMinutes, weekdayNameFromIso } from "@/lib/time";

export const windowSchema = z
  .object({
    weekday: z.coerce.number().int().min(1).max(7),
    startTime: z.string().refine(isTimeString, "请填写开始时间"),
    endTime: z.string().refine(isTimeString, "请填写结束时间"),
  })
  .refine((data) => toMinutes(data.endTime) - toMinutes(data.startTime) >= 30, {
    path: ["endTime"],
    message: "结束时间至少要比开始晚 30 分钟",
  });

export type WindowResult = { ok?: boolean; error?: string };

export function addWindow(subjectId: number | null, formData: FormData): WindowResult {
  const parsed = windowSchema.safeParse({
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "时间格式不对" };
  const { weekday, startTime, endTime } = parsed.data;
  const db = getDb();
  const owner = subjectId === null ? isNull(availability.subjectId) : eq(availability.subjectId, subjectId);
  const ownerType = subjectId === null ? "student" : "subject";
  const existing = db
    .select()
    .from(availability)
    .where(and(eq(availability.ownerType, ownerType), owner, eq(availability.weekday, weekday)))
    .all();
  const clash = existing.find(
    (row) => toMinutes(row.startTime) < toMinutes(endTime) && toMinutes(startTime) < toMinutes(row.endTime),
  );
  if (clash) {
    return { error: `${weekdayNameFromIso(weekday)}已有 ${clash.startTime}–${clash.endTime}，时间段不能重叠` };
  }
  db.insert(availability).values({ ownerType, subjectId, weekday, startTime, endTime }).run();
  logActivity({
    action: "availability.add",
    entityType: ownerType,
    entityId: subjectId ?? "student",
    summary: `添加可上课时间：${weekdayNameFromIso(weekday)} ${startTime}–${endTime}`,
  });
  return { ok: true };
}

export function removeWindow(id: number, subjectId?: number): void {
  const db = getDb();
  const where =
    subjectId === undefined
      ? eq(availability.id, id)
      : and(eq(availability.id, id), eq(availability.subjectId, subjectId));
  db.delete(availability).where(where).run();
}
