import { splitItems } from "@/lib/labels";

const WEBHOOK_RE = /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[\w-]{8,}$/;
const MAX_BYTES = 4000;

export function isValidWebhook(url: string): boolean {
  return WEBHOOK_RE.test(url.trim());
}

function truncateBytes(content: string, maxBytes = MAX_BYTES): string {
  const encoder = new TextEncoder();
  if (encoder.encode(content).length <= maxBytes) return content;
  let result = content;
  while (encoder.encode(`${result}…`).length > maxBytes) {
    result = result.slice(0, Math.floor(result.length * 0.9));
  }
  return `${result}…`;
}

function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s*\n\s*/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function lessonMessage(input: {
  subjectName: string;
  teacherName: string;
  dateText: string;
  topic: string;
  summary: string;
  homework: string;
  prep: string;
  link: string;
}): string {
  const lines = [`**${input.subjectName}课程纪要｜${input.dateText}**`];
  if (input.teacherName) lines.push(`> 任课老师：${input.teacherName}`);
  if (input.topic) lines.push(`> 主题：${input.topic}`);
  if (input.summary) lines.push("", "**本节内容**", excerpt(input.summary, 300));
  const homework = splitItems(input.homework);
  if (homework.length) {
    lines.push("", "**课后作业**", ...homework.map((item, index) => `<font color="warning">${index + 1}. ${item}</font>`));
  }
  const prep = splitItems(input.prep);
  if (prep.length) {
    lines.push("", "**下节课准备**", ...prep.map((item, index) => `<font color="warning">${index + 1}. ${item}</font>`));
  }
  lines.push("", `[打开学习档案查看详情](${input.link})`);
  return truncateBytes(lines.join("\n"));
}

export function materialSetMessage(input: {
  subjectName: string;
  categoryText: string;
  title: string;
  fileCount: number;
  note: string;
  link: string;
}): string {
  const lines = [
    `**新资料：${input.subjectName}${input.categoryText}**`,
    `> ${input.title}（${input.fileCount} 个文件）`,
  ];
  if (input.note) lines.push(`> ${excerpt(input.note, 120)}`);
  lines.push("", `[打开查看和下载](${input.link})`);
  return truncateBytes(lines.join("\n"));
}

export async function sendWecomMarkdown(
  webhook: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidWebhook(webhook)) return { ok: false, error: "群机器人地址格式不对" };
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
    if (!response.ok || body.errcode !== 0) {
      return { ok: false, error: `企业微信返回错误：${body.errmsg ?? response.status}` };
    }
    return { ok: true };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { ok: false, error: timedOut ? "连接企业微信超时，请稍后重试" : "无法连接企业微信" };
  }
}
