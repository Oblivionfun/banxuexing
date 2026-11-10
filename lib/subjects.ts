import type { CSSProperties } from "react";

/** 9 个学科色相：低彩度、亮度一致，避开主色墨蓝（约 265°）。 */
export const SUBJECT_HUES = [25, 60, 95, 140, 180, 215, 240, 300, 345] as const;

export const DEFAULT_SUBJECTS: ReadonlyArray<{ slug: string; name: string; hue: number }> = [
  { slug: "chinese", name: "语文", hue: 25 },
  { slug: "math", name: "数学", hue: 240 },
  { slug: "english", name: "英语", hue: 180 },
  { slug: "physics", name: "物理", hue: 300 },
  { slug: "chemistry", name: "化学", hue: 215 },
  { slug: "biology", name: "生物", hue: 140 },
  { slug: "history", name: "历史", hue: 60 },
  { slug: "geography", name: "地理", hue: 95 },
  { slug: "politics", name: "政治", hue: 345 },
];

export const DEFAULT_STUDENT_NAME = "何同学";

export function subjectStyle(hue: number): CSSProperties {
  return { "--h": hue } as CSSProperties;
}
