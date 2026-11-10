import { describe, expect, it } from "vitest";
import {
  addDays,
  formatRelativeDate,
  formatWeekRange,
  fromMinutes,
  isDateString,
  isTimeString,
  isoWeekday,
  todayKey,
  toMinutes,
  weekDays,
  weekStart,
} from "@/lib/time";

describe("time", () => {
  it("validates date and time strings", () => {
    expect(isDateString("2026-11-11")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026/11/11")).toBe(false);
    expect(isTimeString("09:05")).toBe(true);
    expect(isTimeString("24:00")).toBe(false);
    expect(isTimeString("9:05")).toBe(false);
  });

  it("computes Monday-based weeks across month boundaries", () => {
    expect(isoWeekday("2026-11-15")).toBe(7);
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    expect(weekStart("2026-12-02")).toBe("2026-11-30");
    expect(weekDays("2026-11-30")).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("formats Chinese dates", () => {
    expect(formatWeekRange("2026-11-09")).toBe("11月9日 – 15日");
    expect(formatWeekRange("2026-11-30")).toBe("11月30日 – 12月6日");
    expect(formatRelativeDate("2026-11-11", "2026-11-10")).toBe("明天 周三");
    expect(formatRelativeDate("2026-11-13", "2026-11-10")).toBe("11月13日 周五");
  });

  it("uses Beijing time for today regardless of server time zone", () => {
    expect(todayKey(new Date("2026-11-10T17:30:00Z"))).toBe("2026-11-11");
    expect(todayKey(new Date("2026-11-10T15:59:00Z"))).toBe("2026-11-10");
  });

  it("converts minutes", () => {
    expect(toMinutes("19:30")).toBe(1170);
    expect(fromMinutes(1170)).toBe("19:30");
  });
});
