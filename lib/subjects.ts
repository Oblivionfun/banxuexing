import type { CSSProperties } from "react";

/** 9 个学科色相：低彩度、亮度一致，相邻至少相差 30°，避开主色墨蓝（约 265°）。 */
export const SUBJECT_HUES = [25, 55, 90, 130, 170, 205, 245, 295, 340] as const;

export const DEFAULT_SUBJECTS: ReadonlyArray<{ slug: string; name: string; hue: number }> = [
  { slug: "chinese", name: "语文", hue: 25 },
  { slug: "math", name: "数学", hue: 245 },
  { slug: "english", name: "英语", hue: 170 },
  { slug: "physics", name: "物理", hue: 295 },
  { slug: "chemistry", name: "化学", hue: 205 },
  { slug: "biology", name: "生物", hue: 130 },
  { slug: "history", name: "历史", hue: 55 },
  { slug: "geography", name: "地理", hue: 90 },
  { slug: "politics", name: "政治", hue: 340 },
];

export const DEFAULT_STUDENT_NAME = "何同学";

export function subjectStyle(hue: number): CSSProperties {
  return { "--h": hue } as CSSProperties;
}
