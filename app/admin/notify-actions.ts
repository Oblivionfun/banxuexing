"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, shareUrl } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { lessons, materialSets } from "@/lib/db/schema";
import { materialCategoryLabel } from "@/lib/labels";
import {
  deleteSetting,
  getLesson,
  getMaterialSet,
  getSetting,
  logActivity,
  setSetting,
} from "@/lib/queries";
import { formatDateWithWeekday } from "@/lib/time";
import { isValidWebhook, lessonMessage, materialSetMessage, sendWecomMarkdown } from "@/lib/wecom";
import type { FormState } from "./actions";

const WEBHOOK_KEY = "wecom_webhook";

export async function notifyAction(
  kind: "lesson" | "set",
  id: number,
): Promise<{ error?: string; message?: string }> {
  await requireAdmin();
  const webhook = getSetting(WEBHOOK_KEY);
  if (!webhook) return { error: "还没有设置企业微信群机器人，请先到「设置」页填写" };

  let content: string;
  switch (kind) {
    case "lesson": {
      const found = getLesson(id);
      if (!found) return { error: "这节课不存在" };
      const { lesson } = found;
      if (!lesson.summaryMd && !lesson.homework && !lesson.prep) {
        return { error: "这节课还没有纪要内容，写好后再推送" };
      }
      content = lessonMessage({
        subjectName: lesson.subject.name,
        teacherName: lesson.subject.teacherName,
        dateText: formatDateWithWeekday(lesson.date),
        topic: lesson.topic,
        summary: lesson.summaryMd,
        homework: lesson.homework,
        prep: lesson.prep,
        link: shareUrl(`/lessons/${id}`),
      });
      break;
    }
    case "set": {
      const found = getMaterialSet(id);
      if (!found) return { error: "资料册不存在" };
      content = materialSetMessage({
        subjectName: found.subject.name,
        categoryText: materialCategoryLabel(found.set.category),
        title: found.set.title,
        fileCount: found.files.length,
        note: found.set.note,
        link: shareUrl(`/materials/${id}`),
      });
      break;
    }
    default: {
      const unreachable: never = kind;
      return { error: `unknown kind ${unreachable}` };
    }
  }

  const result = await sendWecomMarkdown(webhook, content);
  if (!result.ok) return { error: result.error };

  const db = getDb();
  if (kind === "lesson") {
    db.update(lessons).set({ notifiedAt: new Date() }).where(eq(lessons.id, id)).run();
  } else {
    db.update(materialSets).set({ notifiedAt: new Date() }).where(eq(materialSets.id, id)).run();
  }
  logActivity({
    action: "notify.wecom",
    entityType: kind,
    entityId: id,
    summary: kind === "lesson" ? "把课程纪要推送到了企业微信群" : "把新资料推送到了企业微信群",
  });
  revalidatePath("/admin", "layout");
  return { message: "已推送到企业微信群" };
}

export async function saveWebhookAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const url = String(formData.get("webhook") ?? "").trim();
  if (url === "") {
    deleteSetting(WEBHOOK_KEY);
    revalidatePath("/admin/settings");
    return { ok: true, message: "已清除群机器人" };
  }
  if (!isValidWebhook(url)) {
    return {
      error: "地址格式不对",
      fieldErrors: {
        webhook: "应以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= 开头，在群机器人详情里复制",
      },
    };
  }
  setSetting(WEBHOOK_KEY, url);
  logActivity({ action: "settings.webhook", entityType: "settings", entityId: WEBHOOK_KEY, summary: "设置了企业微信群机器人" });
  revalidatePath("/admin/settings");
  return { ok: true, message: "已保存" };
}

export async function testWebhookAction(): Promise<{ error?: string; message?: string }> {
  await requireAdmin();
  const webhook = getSetting(WEBHOOK_KEY);
  if (!webhook) return { error: "请先保存群机器人地址" };
  const result = await sendWecomMarkdown(
    webhook,
    `**伴学星 学习档案**\n> 群机器人已连接。以后课程纪要和新资料可以一键推送到这个群。\n\n[打开学习档案](${shareUrl()})`,
  );
  return result.ok ? { message: "测试消息已发送，请到群里查看" } : { error: result.error };
}
