import { cleanLine, parseTeacherSummary } from "@/lib/summary-parser";
import { addDays, daysBetween, isDateString } from "@/lib/time";

/** plan：老师课前发的计划；notes：课后发的总结。 */
export type GroupMessageKind = "plan" | "notes";

export type ParsedGroupMessage = {
  /** 判断不出来时为 null，交给工作人员选。 */
  kind: GroupMessageKind | null;
  subjectId: number | null;
  date: string | null;
  startTime: string | null;
  /** 例如"林老师"；原文没有自我介绍时为空。 */
  teacherName: string;
  topic: string;
  planMd: string;
  planPrep: string;
  summary: string;
  homework: string;
  prep: string;
};

export type SubjectName = { id: number; name: string };

const PLAN_SIGNALS: ReadonlyArray<readonly [RegExp, number]> = [
  [/课前(?:反馈|计划|安排|说明)/, 3],
  [/(?:计划|准备|打算)(?:讲|讲解|学习|复习)/, 2],
  [/预计(?:掌握|讲|用时|时间)/, 2],
  [/时间安排/, 1],
  [/(?:使用|所需|需要的?|用到的?)资料/, 1],
  [/课前(?:准备|提醒)/, 1],
];

const NOTES_SIGNALS: ReadonlyArray<readonly [RegExp, number]> = [
  [/课后(?:反馈|总结|小结)/, 3],
  [/课堂(?:反馈|总结|小结|表现)/, 2],
  [/(?:今天|今日|本节课|这节课|课上)(?:主要)?(?:讲了|学了|学习了|复习了|讲解了|完成了)/, 2],
  [/^(?:\d+[.、．)）]\s*)?(?:课后)?作业\s*[:：]/m, 2],
  [/表现|掌握得|听课/, 1],
];

function score(text: string, signals: ReadonlyArray<readonly [RegExp, number]>): number {
  return signals.reduce((total, [pattern, weight]) => total + (pattern.test(text) ? weight : 0), 0);
}

function detectKind(text: string): GroupMessageKind | null {
  const plan = score(text, PLAN_SIGNALS);
  const notes = score(text, NOTES_SIGNALS);
  if (plan === notes) return null;
  return plan > notes ? "plan" : "notes";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSubject(text: string, subjects: SubjectName[]): number | null {
  let best: { id: number; score: number; index: number } | null = null;
  for (const subject of subjects) {
    if (!subject.name) continue;
    const index = text.indexOf(subject.name);
    if (index < 0) continue;
    const name = escapeRegExp(subject.name);
    const strong = new RegExp(`我是${name}|${name}(?:课|老师|的课)|关于[^，。\\n]{0,12}${name}`).test(text);
    const total = text.split(subject.name).length - 1 + (strong ? 3 : 0);
    if (!best || total > best.score || (total === best.score && index < best.index)) {
      best = { id: subject.id, score: total, index };
    }
  }
  return best?.id ?? null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 原文只写月日，取离今天最近的那一年（跨年时不会错到一年以前）。 */
function resolveMonthDay(month: number, day: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  let best: { key: string; distance: number } | null = null;
  for (const candidate of [year - 1, year, year + 1]) {
    const key = `${candidate}-${pad(month)}-${pad(day)}`;
    if (!isDateString(key)) continue;
    const distance = Math.abs(daysBetween(today, key));
    if (!best || distance < best.distance) best = { key, distance };
  }
  return best?.key ?? null;
}

const RELATIVE_DAYS: ReadonlyArray<readonly [RegExp, number]> = [
  [/今天|今日|今晚/, 0],
  [/明天|明日|明晚/, 1],
  [/后天/, 2],
  [/昨天|昨日|昨晚/, -1],
];

function detectDate(text: string, today: string): string | null {
  const monthDay = /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/.exec(text);
  if (monthDay) return resolveMonthDay(Number(monthDay[1]), Number(monthDay[2]), today);
  let earliest: { index: number; offset: number } | null = null;
  for (const [pattern, offset] of RELATIVE_DAYS) {
    const match = pattern.exec(text);
    if (match && (!earliest || match.index < earliest.index)) earliest = { index: match.index, offset };
  }
  return earliest ? addDays(today, earliest.offset) : null;
}

function detectTime(text: string): string | null {
  const match = /(?<![\d.])([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)(?!\d)/.exec(text);
  return match ? `${pad(Number(match[1]))}:${match[2]}` : null;
}

function detectTeacher(text: string, subjects: SubjectName[]): string {
  const intro = /我是\s*([\u4e00-\u9fa5]{1,10}?)\s*老师/.exec(text) ?? /[-－—]\s*([\u4e00-\u9fa5]{1,10}?)老师/.exec(text);
  if (!intro) return "";
  let name = intro[1];
  for (const subject of subjects) {
    if (subject.name) name = name.replaceAll(subject.name, "");
  }
  name = name.split("的").pop() ?? "";
  return name.length >= 1 && name.length <= 3 ? `${name}老师` : "";
}

const LEAD_IN = /(?:如下|以下)\s*[:：]?\s*$/;
const PLEASANTRY = /^(?:课后我会|如有(?:调整|变动|问题|疑问)|辛苦|谢谢|感谢|收到)/;

/** 去掉"家长您好，我是林老师。关于……如下："这类开场白和结尾客套，只留正文。 */
function contentLines(text: string): string[] {
  const result: string[] = [];
  for (const original of text.split("\n")) {
    let line = original.trim();
    if (!line) continue;
    line = line
      .replace(/^[^，,。！!\n]*?(?:您好|你好|大家好)[，,。！!\s]*/, "")
      .replace(/^我是[^，,。！!]*?老师[，,。！!\s]*/, "")
      .trim();
    if (!line || LEAD_IN.test(line) || PLEASANTRY.test(cleanLine(line))) continue;
    result.push(line);
  }
  return result;
}

/** 小标题里不能有数字，避免把"19:00"的冒号当成小标题。 */
const LABELED = /^([^:：，,。\d]{2,12}?)\s*[:：]\s*(.*)$/;
const PREP_LABEL = /准备|提醒|请带|需要?带|带好/;
const INLINE_PREP = /[，,。；;]\s*(?:(?:课前)?(?:准备|提醒)|请带|需要?带)\s*[:：]\s*(.+)$/;

const stripEnd = (value: string) => value.replace(/[。；;，,\s]+$/, "");

/** 课前计划按"小标题：内容"整理成加粗标签；"课前准备/提醒"单独拿出来。 */
function splitPlan(lines: string[]): { planMd: string; planPrep: string } {
  const plan: string[] = [];
  const prep: string[] = [];
  let inPrep = false;
  for (const line of lines) {
    const text = cleanLine(line);
    const labeled = LABELED.exec(text);
    if (labeled) {
      const [, label, content] = labeled;
      inPrep = PREP_LABEL.test(label);
      if (inPrep) {
        if (content) prep.push(stripEnd(content));
      } else {
        plan.push(content ? `**${label.trim()}**：${content}` : `**${label.trim()}**`);
      }
      continue;
    }
    if (inPrep) {
      prep.push(stripEnd(text));
      continue;
    }
    const inline = INLINE_PREP.exec(text);
    if (inline) {
      plan.push(stripEnd(text.slice(0, inline.index)));
      prep.push(stripEnd(inline[1]));
      continue;
    }
    plan.push(text);
  }
  return { planMd: plan.join("\n"), planPrep: prep.filter(Boolean).join("\n") };
}

const TOPIC_PATTERNS: Record<GroupMessageKind, RegExp[]> = {
  plan: [
    /学习([^，。；;,\n]{2,24})/,
    /(?:本次|本节|这节)课?(?:计划)?讲\s*[:：]?\s*([^，。；;,\n]{2,24})/,
    /重点是([^，。；;,\n]{2,24})/,
  ],
  notes: [/(?:今天|今日|本节课|这节课|课上)(?:主要)?(?:讲了|学了|学习了|复习了|讲解了)([^，。；;,\n]{2,24})/],
};

function extractTopic(text: string, kind: GroupMessageKind): string {
  for (const pattern of TOPIC_PATTERNS[kind]) {
    const match = pattern.exec(text);
    if (match) return match[1].replace(/^[了的]/, "").trim();
  }
  return "";
}

export type LessonCandidate = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: "planned" | "done" | "cancelled";
  topic: string;
  hasPlan: boolean;
  hasNotes: boolean;
};

/**
 * 推荐写到哪节课：日期对得上就用那天的课（时间也对得上更好）；
 * 原文写了日期但那天没课，返回 null 表示新建；没写日期时，
 * 课前计划找最近一节还没上的课，课后总结找最近一节已上但没纪要的课。
 */
export function suggestLesson(
  candidates: LessonCandidate[],
  { kind, date, startTime, today }: { kind: GroupMessageKind; date: string | null; startTime: string | null; today: string },
): number | null {
  const active = candidates.filter((lesson) => lesson.status !== "cancelled");
  if (date) {
    const sameDay = active.filter((lesson) => lesson.date === date);
    return (sameDay.find((lesson) => lesson.startTime === startTime) ?? sameDay[0])?.id ?? null;
  }
  const byDate = [...active].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  if (kind === "plan") {
    return byDate.find((lesson) => lesson.date >= today && lesson.status === "planned")?.id ?? null;
  }
  const past = byDate.filter((lesson) => lesson.date <= today).reverse();
  return (past.find((lesson) => !lesson.hasNotes) ?? past[0])?.id ?? null;
}

/** 规则识别老师在群里发的课前计划或课后总结；识别结果都要工作人员确认后才写入。 */
export function parseGroupMessage(
  raw: string,
  { subjects, today }: { subjects: SubjectName[]; today: string },
): ParsedGroupMessage {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  const kind = detectKind(text);
  const body = contentLines(text);
  const plan = splitPlan(body);
  const notes = parseTeacherSummary(body.join("\n"));
  return {
    kind,
    subjectId: detectSubject(text, subjects),
    date: detectDate(text, today),
    startTime: detectTime(text),
    teacherName: detectTeacher(text, subjects),
    topic: extractTopic(text, kind ?? "notes"),
    planMd: plan.planMd,
    planPrep: plan.planPrep,
    summary: notes.summary,
    homework: notes.homework,
    prep: notes.prep,
  };
}
