import type { FileKind, LessonSource, LessonStatus, MaterialCategory } from "@/lib/enums";

export function lessonStatusLabel(status: LessonStatus): string {
  switch (status) {
    case "planned":
      return "待上课";
    case "done":
      return "已上课";
    case "cancelled":
      return "已取消";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function lessonSourceLabel(source: LessonSource): string {
  switch (source) {
    case "manual":
      return "工作人员录入";
    case "wechat":
      return "老师群内总结";
    case "meeting":
      return "腾讯会议录音整理";
    default: {
      const unreachable: never = source;
      return unreachable;
    }
  }
}

export function materialCategoryLabel(category: MaterialCategory): string {
  switch (category) {
    case "textbook":
      return "课本";
    case "paper":
      return "试卷";
    case "exam":
      return "考试";
    case "homework":
      return "作业";
    case "notes":
      return "笔记";
    case "other":
      return "其他";
    default: {
      const unreachable: never = category;
      return unreachable;
    }
  }
}

export function fileKindLabel(kind: FileKind): string {
  switch (kind) {
    case "image":
      return "图片";
    case "pdf":
      return "PDF";
    case "doc":
      return "文档";
    case "audio":
      return "录音";
    case "other":
      return "文件";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}\u00a0B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}\u00a0KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}\u00a0MB`;
}

/** 把老师总结里一行一条的内容拆成条目，去掉常见的序号和符号前缀。 */
export function splitItems(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•·●○◦▪]|\d+[.、．)）]|[（(]\d+[)）]|[一二三四五六七八九十]+[、.．])\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}
