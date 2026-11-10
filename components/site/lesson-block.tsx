import Link from "next/link";
import { Ban, Check, Clock3 } from "lucide-react";
import { cn } from "cn";
import { lessonStatusLabel } from "@/lib/labels";
import type { LessonWithSubject } from "@/lib/queries";
import { subjectStyle } from "@/lib/subjects";
import { formatTimeRange } from "@/lib/time";

function StatusIcon({ status }: { status: LessonWithSubject["status"] }) {
  switch (status) {
    case "done":
      return <Check className="size-3.5" aria-hidden />;
    case "planned":
      return <Clock3 className="size-3.5" aria-hidden />;
    case "cancelled":
      return <Ban className="size-3.5" aria-hidden />;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function hasNotes(lesson: Pick<LessonWithSubject, "summaryMd" | "homework" | "prep">) {
  return Boolean(lesson.summaryMd || lesson.homework || lesson.prep);
}

/** 课表格子：学科浅底填满，一节课就是课程表上的一格。 */
export function LessonBlock({
  lesson,
  compact = false,
}: {
  lesson: LessonWithSubject;
  compact?: boolean;
}) {
  const cancelled = lesson.status === "cancelled";
  const notes = hasNotes(lesson);

  if (compact) {
    return (
      <Link
        href={`/lessons/${lesson.id}`}
        style={subjectStyle(lesson.subject.hue)}
        aria-label={`${formatTimeRange(lesson.startTime, lesson.endTime)} ${lesson.subject.name} ${lesson.subject.teacherName} ${lessonStatusLabel(lesson.status)}`}
        className={cn(
          "subj-tint block rounded-md px-2.5 py-2 transition-[filter] duration-150 hover:brightness-[0.97]",
          cancelled && "opacity-60",
        )}
      >
        <span className="flex items-center justify-between gap-1">
          <span className={cn("tabular text-sm font-medium subj-ink", cancelled && "line-through")}>
            {lesson.startTime}
          </span>
          <span className="subj-ink">
            <StatusIcon status={lesson.status} />
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[0.9375rem] font-semibold text-ink">{lesson.subject.name}</span>
        {lesson.subject.teacherName ? (
          <span className="block truncate text-sm text-ink-2">{lesson.subject.teacherName}</span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      style={subjectStyle(lesson.subject.hue)}
      className={cn(
        "subj-tint group block rounded-md px-3.5 py-3 transition-[filter] duration-150 hover:brightness-[0.97]",
        cancelled && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "tabular text-sm font-medium tracking-[0.01em] subj-ink",
            cancelled && "line-through",
          )}
        >
          {formatTimeRange(lesson.startTime, lesson.endTime)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs tracking-[0.02em] subj-ink">
          <StatusIcon status={lesson.status} />
          {lessonStatusLabel(lesson.status)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-ink">
          {lesson.subject.name}
        </span>
        {lesson.subject.teacherName ? (
          <span className="truncate text-sm text-ink-2">{lesson.subject.teacherName}</span>
        ) : null}
      </div>
      {lesson.topic ? <p className="mt-0.5 truncate text-base text-ink-2">{lesson.topic}</p> : null}
      {notes ? (
        <p className="mt-1.5 text-sm font-medium subj-ink">看纪要</p>
      ) : null}
    </Link>
  );
}
