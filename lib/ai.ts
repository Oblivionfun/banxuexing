import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Output, generateText } from "ai";
import { z } from "zod";
import { getEnv, isAiConfigured } from "@/lib/env";
import type { ParsedGroupMessage, SubjectName } from "@/lib/group-message";
import type { StructuredSummary } from "@/lib/summary-parser";
import { isDateString, isTimeString } from "@/lib/time";

const outputSchema = z.object({
  topic: z.string().describe("本节课主题，10 个字以内；原文没有明确主题时留空"),
  summary: z.string().describe("本节课讲了什么、学生表现如何，保留老师原意，可适当分段"),
  homework: z.array(z.string()).describe("课后作业，每项一条；没有则为空数组"),
  prep: z.array(z.string()).describe("下节课前要准备或预习的内容，每项一条；没有则为空数组"),
});

const SYSTEM_PROMPT = `你在帮一家辅导机构整理任课老师发到微信群里的课后总结，整理结果会给家长看。
规则：
1. 只根据原文提取和归类，不要补充原文没有的信息，不要评价老师或学生。
2. 作业和下节课准备拆成一条一条，保留页码、题号、截止时间等细节。
3. 语气平实，去掉"辛苦了""收到"之类的寒暄。`;

function chatModel() {
  const env = getEnv();
  const provider = createOpenAICompatible({
    name: "bxx-llm",
    baseURL: env.AI_BASE_URL as string,
    apiKey: env.AI_API_KEY,
  });
  return provider.chatModel(env.AI_MODEL as string);
}

const joinItems = (items: string[]) => items.map((item) => item.trim()).filter(Boolean).join("\n");

export async function structureWithAi(raw: string, subjectName?: string): Promise<StructuredSummary> {
  if (!isAiConfigured()) throw new Error("AI 未配置");
  const { output } = await generateText({
    model: chatModel(),
    system: SYSTEM_PROMPT,
    prompt: `${subjectName ? `科目：${subjectName}\n` : ""}老师原文：\n${raw}`,
    output: Output.object({ schema: outputSchema }),
    temperature: 0.2,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(25_000),
  });
  return {
    topic: output.topic.trim().slice(0, 100),
    summary: output.summary.trim(),
    homework: joinItems(output.homework),
    prep: joinItems(output.prep),
  };
}

const groupMessageSchema = z.object({
  kind: z
    .enum(["plan", "notes", "other"])
    .describe("plan：上课前发的计划或安排；notes：上完课后发的总结或反馈；other：闲聊、通知等其他内容"),
  subject: z.string().describe("科目名称，必须是给出的科目之一；看不出来留空"),
  date: z.string().describe("这节课的日期，格式 YYYY-MM-DD；原文只写月日时按今天推算年份；看不出来留空"),
  startTime: z.string().describe("上课开始时间，格式 HH:mm；原文没写留空"),
  teacherName: z.string().describe("老师的称呼，例如“林老师”；原文没有留空"),
  topic: z.string().describe("这节课的主题，15 个字以内；看不出来留空"),
  planMd: z
    .string()
    .describe("仅课前计划：讲什么、时间安排、预计掌握程度、使用资料，每项一行，格式“**小标题**：内容”，保留老师原话"),
  planPrep: z.array(z.string()).describe("仅课前计划：上课前学生要准备或带上的东西，每项一条"),
  summary: z.string().describe("仅课后总结：本节课讲了什么、学生表现如何，保留老师原意"),
  homework: z.array(z.string()).describe("仅课后总结：课后作业，每项一条"),
  prep: z.array(z.string()).describe("仅课后总结：下节课前要准备或预习的内容，每项一条"),
});

const GROUP_SYSTEM_PROMPT = `你在帮一家辅导机构整理任课老师发到微信群里的消息，整理结果会给家长看。
规则：
1. 先判断这是课前计划、课后总结，还是其他内容。
2. 只根据原文提取和归类，不要补充原文没有的信息，不要评价老师或学生。
3. 拆条目时保留页码、题号、截止时间等细节；去掉“您好”“辛苦了”“如有调整会提前沟通”之类的客套话。
4. 和判断出的类型无关的字段留空。`;

/** 大模型识别群消息；结果和规则识别同一个结构，日期、时间、科目都会再校验一遍。 */
export async function structureGroupMessageWithAi(
  raw: string,
  { subjects, today }: { subjects: SubjectName[]; today: string },
): Promise<ParsedGroupMessage> {
  if (!isAiConfigured()) throw new Error("AI 未配置");
  const { output } = await generateText({
    model: chatModel(),
    system: GROUP_SYSTEM_PROMPT,
    prompt: `今天是 ${today}。\n可选科目：${subjects.map((subject) => subject.name).join("、")}\n老师原文：\n${raw}`,
    output: Output.object({ schema: groupMessageSchema }),
    temperature: 0.1,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(25_000),
  });
  return {
    kind: output.kind === "other" ? null : output.kind,
    subjectId: subjects.find((subject) => subject.name === output.subject.trim())?.id ?? null,
    date: isDateString(output.date) ? output.date : null,
    startTime: isTimeString(output.startTime) ? output.startTime : null,
    teacherName: output.teacherName.trim().slice(0, 20),
    topic: output.topic.trim().slice(0, 100),
    planMd: output.planMd.trim(),
    planPrep: joinItems(output.planPrep),
    summary: output.summary.trim(),
    homework: joinItems(output.homework),
    prep: joinItems(output.prep),
  };
}
