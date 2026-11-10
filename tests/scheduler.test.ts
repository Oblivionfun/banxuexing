import { describe, expect, it } from "vitest";
import { proposeSchedule, type ScheduleInput } from "@/lib/scheduler";
import { toMinutes } from "@/lib/time";

const weekStart = "2026-11-16";
const allWeek = [3, 4, 5, 6, 7].map((weekday) => ({ weekday, startTime: "08:30", endTime: "21:00" }));

function overlapping(slots: { date: string; startTime: string; endTime: string }[], gap = 15) {
  return slots.some((a, i) =>
    slots.some(
      (b, j) =>
        i !== j &&
        a.date === b.date &&
        toMinutes(a.startTime) < toMinutes(b.endTime) + gap &&
        toMinutes(b.startTime) < toMinutes(a.endTime) + gap,
    ),
  );
}

describe("proposeSchedule", () => {
  it("places every session without overlaps and keeps one lesson per subject per day", () => {
    const input: ScheduleInput = {
      weekStart,
      studentWindows: allWeek,
      busy: [],
      subjects: [
        { subjectId: 1, name: "数学", sessions: 2, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "08:30", endTime: "12:00" }, { weekday: 6, startTime: "14:00", endTime: "18:00" }] },
        { subjectId: 2, name: "物理", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "08:30", endTime: "10:00" }] },
        { subjectId: 3, name: "英语", sessions: 2, minutes: 90, teacherWindows: [{ weekday: 4, startTime: "14:00", endTime: "17:00" }, { weekday: 7, startTime: "09:00", endTime: "12:00" }] },
      ],
    };
    const result = proposeSchedule(input);
    expect(result.unmet).toEqual([]);
    expect(result.slots).toHaveLength(5);
    expect(overlapping(result.slots)).toBe(false);
    const physics = result.slots.find((slot) => slot.subjectId === 2);
    expect(physics).toMatchObject({ date: "2026-11-18", startTime: "08:30", endTime: "10:00" });
    const mathDays = result.slots.filter((slot) => slot.subjectId === 1).map((slot) => slot.date);
    expect(new Set(mathDays).size).toBe(2);
  });

  it("finds a full solution that a greedy pass would miss", () => {
    // 数学只能 9:00–10:30；物理 9:00–12:00。贪心先给物理排 9:00 会挤掉数学。
    const result = proposeSchedule({
      weekStart,
      studentWindows: [{ weekday: 3, startTime: "08:00", endTime: "13:00" }],
      busy: [],
      subjects: [
        { subjectId: 2, name: "物理", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "09:00", endTime: "12:30" }] },
        { subjectId: 1, name: "数学", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "09:00", endTime: "10:30" }] },
      ],
    });
    expect(result.unmet).toEqual([]);
    expect(overlapping(result.slots)).toBe(false);
  });

  it("avoids existing lessons and explains what could not be placed", () => {
    const result = proposeSchedule({
      weekStart,
      studentWindows: [{ weekday: 3, startTime: "09:00", endTime: "12:00" }],
      busy: [{ date: "2026-11-18", startTime: "09:00", endTime: "10:30" }],
      subjects: [
        { subjectId: 1, name: "数学", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "09:00", endTime: "12:00" }] },
        { subjectId: 2, name: "化学", sessions: 1, minutes: 60, teacherWindows: [] },
        { subjectId: 3, name: "生物", sessions: 1, minutes: 60, teacherWindows: [{ weekday: 1, startTime: "09:00", endTime: "12:00" }] },
      ],
    });
    expect(result.slots).toEqual([]);
    const reasons = Object.fromEntries(result.unmet.map((item) => [item.name, item.reason]));
    expect(reasons["数学"]).toBe("老师和学生的空闲时间没有重合");
    expect(reasons["化学"]).toBe("老师还没有填可上课时间");
    expect(reasons["生物"]).toBe("老师和学生的空闲时间没有重合");
  });

  it("returns the best partial plan when the week is too full", () => {
    const result = proposeSchedule({
      weekStart,
      studentWindows: [{ weekday: 3, startTime: "09:00", endTime: "11:00" }],
      busy: [],
      subjects: [
        { subjectId: 1, name: "数学", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "09:00", endTime: "11:00" }] },
        { subjectId: 2, name: "物理", sessions: 1, minutes: 90, teacherWindows: [{ weekday: 3, startTime: "09:00", endTime: "11:00" }] },
      ],
    });
    expect(result.slots).toHaveLength(1);
    expect(result.unmet).toHaveLength(1);
    expect(result.unmet[0].reason).toBe("空闲时间被其他科目占满了");
  });
});
