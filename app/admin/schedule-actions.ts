"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addWindow, removeWindow, type WindowResult } from "@/lib/availability";
import type { ProposedSlot } from "@/lib/scheduler";
import {
  applyScheduleSlots,
  proposeScheduleForWeek,
  type ScheduleProposal,
} from "@/lib/services/schedule";
import { isDateString, isTimeString } from "@/lib/time";

export type { ScheduleProposal };

export async function addWindowAction(
  subjectId: number | null,
  _prev: WindowResult,
  formData: FormData,
): Promise<WindowResult> {
  await requireAdmin();
  const result = addWindow(subjectId, formData);
  if (result.ok) revalidatePath("/admin/scheduling");
  return result;
}

export async function removeWindowAction(id: number): Promise<void> {
  await requireAdmin();
  removeWindow(id);
  revalidatePath("/admin/scheduling");
}

export async function generateScheduleAction(anchor: string): Promise<ScheduleProposal> {
  await requireAdmin();
  return proposeScheduleForWeek(anchor);
}

const slotSchema = z.object({
  subjectId: z.number().int().positive(),
  date: z.string().refine(isDateString),
  startTime: z.string().refine(isTimeString),
  endTime: z.string().refine(isTimeString),
});

export async function applyScheduleAction(slots: ProposedSlot[]): Promise<{ message?: string; error?: string }> {
  await requireAdmin();
  const parsed = z.array(slotSchema).max(80).safeParse(slots);
  if (!parsed.success || parsed.data.length === 0) return { error: "没有可以加入的课程" };

  const result = applyScheduleSlots(parsed.data);
  revalidatePath("/", "layout");
  const conflicts = result.skipped.filter((slot) => slot.reason === "conflict").length;
  return {
    message: `已加入 ${result.created} 节课${
      result.skipped.length
        ? `，${result.skipped.length} 节跳过${conflicts ? `（${conflicts} 节时间冲突）` : ""}`
        : ""
    }`,
  };
}
