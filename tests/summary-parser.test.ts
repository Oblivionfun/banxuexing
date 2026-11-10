import { describe, expect, it } from "vitest";
import { splitItems } from "@/lib/labels";
import { parseTeacherSummary } from "@/lib/summary-parser";

describe("parseTeacherSummary", () => {
  it("splits a typical WeChat summary by headings", () => {
    const result = parseTeacherSummary(
      "今天讲了一元一次方程，移项还要多练。\n孩子听课很认真。\n作业：练习册P23-25\n订正小测错题\n下节课：带三角板",
    );
    expect(result.summary).toBe("今天讲了一元一次方程，移项还要多练。\n孩子听课很认真。");
    expect(result.homework).toBe("练习册P23-25\n订正小测错题");
    expect(result.prep).toBe("带三角板");
  });

  it("does not mistake 练习册 or 作业完成得 for headings", () => {
    const result = parseTeacherSummary("练习册第三页做得很好\n作业完成得不错");
    expect(result.homework).toBe("");
    expect(result.summary).toBe("练习册第三页做得很好\n作业完成得不错");
  });

  it("handles numbered sections, bracket headings and inline prep lines", () => {
    const result = parseTeacherSummary(
      "【本节内容】复习第二单元\n1. 课后作业：\n- 背单词 Unit 2\n- 完成 B 篇阅读\n预习 Unit 3 课文",
    );
    expect(result.summary).toBe("复习第二单元");
    expect(result.homework).toBe("背单词 Unit 2\n完成 B 篇阅读\n预习 Unit 3 课文");
  });

  it("routes 预习 lines to prep while still in the summary section", () => {
    const result = parseTeacherSummary("讲了光的折射\n预习下一节");
    expect(result.summary).toBe("讲了光的折射");
    expect(result.prep).toBe("预习下一节");
  });
});

describe("splitItems", () => {
  it("strips common list markers", () => {
    expect(splitItems("1. 练习册\n2、订正\n- 背诵\n（3）预习\n\n一、带尺子")).toEqual([
      "练习册",
      "订正",
      "背诵",
      "预习",
      "带尺子",
    ]);
  });
});
