export const LESSON_STATUSES = ["planned", "done", "cancelled"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const LESSON_SOURCES = ["manual", "wechat", "meeting"] as const;
export type LessonSource = (typeof LESSON_SOURCES)[number];

export const MATERIAL_CATEGORIES = [
  "textbook",
  "paper",
  "exam",
  "homework",
  "notes",
  "other",
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const FILE_KINDS = ["image", "pdf", "doc", "audio", "other"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const AVAILABILITY_OWNERS = ["student", "subject"] as const;
export type AvailabilityOwner = (typeof AVAILABILITY_OWNERS)[number];
