export type StructuredSummary = {
  topic: string;
  summary: string;
  homework: string;
  prep: string;
};

type Section = "summary" | "homework" | "prep";

/** 小标题后面必须跟冒号、"是/为"或直接换行，避免把"练习册""作业完成得很好"误判成标题。 */
const HOMEWORK_HEADER =
  /^(?:课后|今日|今天的?|本节课?的?)?(?:作业|练习)(?:布置)?(?:如下)?\s*(?:[:：]|是|为|$)\s*(.*)$/;
const PREP_HEADER =
  /^(?:(?:下节课?|下次课?|下一节课?|下周)的?(?:准备|需要准备|要准备|请带|内容)?|课前准备|需要准备|请准备|准备)\s*(?:[:：]|$)\s*(.*)$/;
const SUMMARY_HEADER =
  /^(?:本节课?|今天|今日|本次|课堂)课?(?:内容|总结|小结|讲了|学习了|情况)\s*[:：]\s*(.*)$/;
const PREP_INLINE = /^(?:预习|复习|带上|请带|下节课?|下次课?)/;

/** 去掉序号和列表符号，并把"【作业】"这类方括号小标题统一成"作业："。 */
function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:\d+[.、．)）]|[-*•·])\s*/, "")
    .replace(/^[【\[]([^】\]]{1,12})[】\]]\s*/, "$1：")
    .trim();
}

/** 规则拆分：按"作业""下节课准备"等常见小标题把老师的总结分成三段。 */
export function parseTeacherSummary(raw: string): StructuredSummary {
  const sections: Record<Section, string[]> = { summary: [], homework: [], prep: [] };
  let current: Section = "summary";

  for (const original of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const line = original.trim();
    if (!line) continue;
    const text = cleanLine(line);

    const homework = HOMEWORK_HEADER.exec(text);
    if (homework) {
      current = "homework";
      if (homework[1]) sections.homework.push(homework[1]);
      continue;
    }
    const prep = PREP_HEADER.exec(text);
    if (prep) {
      current = "prep";
      if (prep[1]) sections.prep.push(prep[1]);
      continue;
    }
    const summary = SUMMARY_HEADER.exec(text);
    if (summary) {
      current = "summary";
      if (summary[1]) sections.summary.push(summary[1]);
      continue;
    }
    if (current === "summary" && PREP_INLINE.test(text)) {
      sections.prep.push(text);
      continue;
    }
    sections[current].push(current === "summary" ? line : text);
  }

  return {
    topic: "",
    summary: sections.summary.join("\n"),
    homework: sections.homework.join("\n"),
    prep: sections.prep.join("\n"),
  };
}
