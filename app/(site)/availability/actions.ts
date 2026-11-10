"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { addWindow, removeWindow, type WindowResult } from "@/lib/availability";
import { getSubjectById } from "@/lib/queries";

export async function teacherAddWindowAction(
  subjectId: number,
  _prev: WindowResult,
  formData: FormData,
): Promise<WindowResult> {
  await requireViewer();
  if (!getSubjectById(subjectId)) return { error: "科目不存在" };
  const result = addWindow(subjectId, formData);
  if (result.ok) revalidatePath("/availability");
  return result;
}

export async function teacherRemoveWindowAction(subjectId: number, id: number): Promise<void> {
  await requireViewer();
  removeWindow(id, subjectId);
  revalidatePath("/availability");
}
