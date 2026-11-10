import { describe, expect, it } from "vitest";
import { parseGroupMessage } from "@/lib/group-message";

const SUBJECTS = [
  { id: 1, name: "语文" },
  { id: 2, name: "数学" },
  { id: 3, name: "英语" },
  { id: 4, name: "物理" },
  { id: 5, name: "化学" },
];

const PLAN_MESSAGE = `家长、同学您好，我是数学林老师。关于11月11日数学的课前反馈如下：

1. 本次计划讲：复习上次讲解的函数的基本定义性质，学习函数的单调性、最值与奇偶性，重点是函数的最值范围求解与奇偶性，难点是函数奇偶性的理解、证明与变换。
2. 时间安排：预计10分钟快速回忆复习，80分钟讲函数最值与奇偶性，30分钟教材例题与习题练习与讲解。
3. 预计掌握程度：希望孩子能①初步理解函数相关的核心概念并能复述，建立大概的函数理解体系；②能正确理解题目含义看懂题目，明确基础题目解题思路，独立完成教材例题、课后题基础题，正确率约70%。
4. 使用资料：函数入门讲义(重点最值与奇偶性部分)，数学教材，中期考试试卷。
5. 课前准备/提醒：准备好数学教材、中期考试试卷。
6. 课后我会及时反馈掌握情况和作业。如有调整会提前沟通🙂`;

describe("parseGroupMessage", () => {
  it("reads a teacher's pre-class plan from the group", () => {
    const result = parseGroupMessage(PLAN_MESSAGE, { subjects: SUBJECTS, today: "2026-11-10" });
    expect(result.kind).toBe("plan");
    expect(result.subjectId).toBe(2);
    expect(result.date).toBe("2026-11-11");
    expect(result.startTime).toBeNull();
    expect(result.teacherName).toBe("林老师");
    expect(result.topic).toBe("函数的单调性、最值与奇偶性");
    expect(result.planPrep).toBe("准备好数学教材、中期考试试卷");
    expect(result.planMd.split("\n")).toEqual([
      expect.stringMatching(/^\*\*本次计划讲\*\*：复习上次讲解的函数/),
      expect.stringMatching(/^\*\*时间安排\*\*：预计10分钟/),
      expect.stringMatching(/^\*\*预计掌握程度\*\*：希望孩子能/),
      "**使用资料**：函数入门讲义(重点最值与奇偶性部分)，数学教材，中期考试试卷。",
    ]);
  });

  it("reads an after-class summary and drops the greeting", () => {
    const result = parseGroupMessage(
      "家长您好，今天讲了一元一次方程的解法，孩子掌握得不错。\n作业：练习册P23-25\n下节课：带三角板\n辛苦了",
      { subjects: SUBJECTS, today: "2026-11-12" },
    );
    expect(result.kind).toBe("notes");
    expect(result.date).toBe("2026-11-12");
    expect(result.subjectId).toBeNull();
    expect(result.topic).toBe("一元一次方程的解法");
    expect(result.summary).toBe("今天讲了一元一次方程的解法，孩子掌握得不错。");
    expect(result.homework).toBe("练习册P23-25");
    expect(result.prep).toBe("带三角板");
  });

  it("picks the nearest year for month-day dates across new year", () => {
    const options = { subjects: SUBJECTS, today: "2026-12-30" };
    expect(parseGroupMessage("1月3日物理课前计划", options).date).toBe("2027-01-03");
    expect(parseGroupMessage("12月28号的课后反馈", { ...options, today: "2027-01-02" }).date).toBe("2026-12-28");
  });

  it("finds the teacher and subject in other phrasings", () => {
    const result = parseGroupMessage("大家好，我是负责物理的陈老师，明天19:00上课，课前准备：带直尺", {
      subjects: SUBJECTS,
      today: "2026-11-10",
    });
    expect(result.teacherName).toBe("陈老师");
    expect(result.subjectId).toBe(4);
    expect(result.date).toBe("2026-11-11");
    expect(result.startTime).toBe("19:00");
    expect(result.kind).toBe("plan");
    expect(result.planPrep).toBe("带直尺");
  });

  it("leaves the kind open for chit-chat", () => {
    const result = parseGroupMessage("收到，谢谢老师", { subjects: SUBJECTS, today: "2026-11-10" });
    expect(result.kind).toBeNull();
    expect(result.subjectId).toBeNull();
    expect(result.planMd).toBe("");
  });
});
