import { describe, expect, it } from "vitest";
import { TEACHER_PROFILE_TEMPLATE, parseTeacherProfile, visibleProfile } from "@/lib/teacher-profile";

describe("parseTeacherProfile", () => {
  it("reads the blank template into its sections", () => {
    const profile = parseTeacherProfile(TEACHER_PROFILE_TEMPLATE);
    expect(profile.title).toBe("XX大学X老师");
    expect(profile.sections.map((section) => section.title)).toEqual([
      "基本信息",
      "资质背景",
      "辅导范围",
      "授课安排",
      "教学适配",
      "辅导经历",
      "补充说明",
    ]);
    const experience = profile.sections[5];
    expect(experience.groups.map((group) => group.index)).toEqual(["1", "2"]);
    expect(experience.groups[0].items.map((item) => item.label)).toEqual(["时间", "辅导对象", "辅导内容", "教学成果"]);
  });

  it("hides fields left blank and keeps multi-line values", () => {
    const profile = visibleProfile(
      parseTeacherProfile(
        [
          "【北京航空航天大学陈老师】",
          "📌 基本信息",
          "▪ 姓名：陈妍",
          "▪ 年龄：",
          "🏆 资质背景",
          "▪ 高考成绩：",
          "📝 辅导经历（可续写）",
          "▪ 1. 时间：",
          "▪ 辅导对象：高三女生",
          "▪ 教学成果：作文均分由41提升至52",
          "语文均分由100+提升至115+",
          "▪ 2. 时间：",
          "▪ 辅导对象：",
          "✨ 补充说明：家长和学生一致好评",
        ].join("\n"),
      ),
    );
    expect(profile.title).toBe("北京航空航天大学陈老师");
    expect(profile.sections.map((section) => section.title)).toEqual(["基本信息", "辅导经历", "补充说明"]);
    expect(profile.sections[0].groups[0].items).toEqual([{ label: "姓名", value: "陈妍" }]);
    expect(profile.sections[1].groups).toEqual([
      {
        index: "1",
        items: [
          { label: "辅导对象", value: "高三女生" },
          { label: "教学成果", value: "作文均分由41提升至52\n语文均分由100+提升至115+" },
        ],
      },
    ]);
    expect(profile.sections[2].text).toBe("家长和学生一致好评");
  });

  it("treats the untouched template as having only the preset hints", () => {
    const shown = visibleProfile(parseTeacherProfile(TEACHER_PROFILE_TEMPLATE));
    expect(shown.sections.flatMap((section) => section.groups.flatMap((group) => group.items.map((item) => item.label)))).toEqual([
      "授课形式",
      "可授课时段",
      "上课频率",
      "试课安排",
      "适配学生类型",
      "备注",
    ]);
  });
});
