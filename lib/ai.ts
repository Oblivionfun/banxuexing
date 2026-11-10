import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Output, generateText } from "ai";
import { z } from "zod";
import { getEnv, isAiConfigured } from "@/lib/env";
import type { StructuredSummary } from "@/lib/summary-parser";

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

export async function structureWithAi(raw: string, subjectName?: string): Promise<StructuredSummary> {
  if (!isAiConfigured()) throw new Error("AI 未配置");
  const env = getEnv();
  const provider = createOpenAICompatible({
    name: "bxx-llm",
    baseURL: env.AI_BASE_URL as string,
    apiKey: env.AI_API_KEY,
  });
  const { output } = await generateText({
    model: provider.chatModel(env.AI_MODEL as string),
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
    homework: output.homework.map((item) => item.trim()).filter(Boolean).join("\n"),
    prep: output.prep.map((item) => item.trim()).filter(Boolean).join("\n"),
  };
}
