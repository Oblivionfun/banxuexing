import Link from "next/link";
import { cn } from "cn";
import { SubjectSwatch } from "@/components/subject-mark";
import type { LessonWithSubject } from "@/lib/queries";
import { dayOfMonth, formatDateWithWeekday, weekdayShort } from "@/lib/time";
import { LessonBlock } from "./lesson-block";

/** 手机上的 7 天日期条：今天墨蓝实心，选中的一天加描边，有课的日子下面标出学科色点。 */
export function WeekStrip({
  days,
  today,
  selected,
  lessons,
  hrefFor,
}: {
  days: string[];
  today: string;
  selected: string;
  lessons: LessonWithSubject[];
  hrefFor: (day: string) => string;
}) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="选择日期">
      {days.map((day) => {
        const ofDay = lessons.filter((lesson) => lesson.date === day && lesson.status !== "cancelled");
        const isToday = day === today;
        const isSelected = day === selected;
        const hues = [...new Set(ofDay.map((lesson) => lesson.subject.hue))].slice(0, 3);
        return (
          <li key={day}>
            <Link
              href={hrefFor(day)}
              scroll={false}
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${formatDateWithWeekday(day)}，${ofDay.length} 节课`}
              className="flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors duration-150 hover:bg-paper"
            >
              <span className={cn("text-xs", isToday ? "font-medium text-brand" : "text-ink-3")}>
                {weekdayShort(day)}
              </span>
              <span
                className={cn(
                  "tabular flex size-9 items-center justify-center rounded-full text-[0.9375rem]",
                  isToday && "bg-brand font-semibold text-white",
                  !isToday && isSelected && "font-semibold text-brand ring-2 ring-brand ring-inset",
                  !isToday && !isSelected && "text-ink",
                )}
              >
                {dayOfMonth(day)}
              </span>
              <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                {hues.map((hue) => (
                  <SubjectSwatch key={hue} hue={hue} className="size-1.5 rounded-full" />
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** 桌面端的周课程表：七列，按课程表的列节奏排开。 */
export function WeekGrid({
  days,
  today,
  lessons,
}: {
  days: string[];
  today: string;
  lessons: LessonWithSubject[];
}) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-rule bg-surface">
      {days.map((day, index) => {
        const ofDay = lessons.filter((lesson) => lesson.date === day);
        const isToday = day === today;
        return (
          <section
            key={day}
            aria-label={formatDateWithWeekday(day)}
            className={cn("flex min-h-56 flex-col", index > 0 && "border-l border-rule", isToday && "bg-brand-tint/35")}
          >
            <header className="flex items-center gap-2 border-b border-rule px-2.5 py-2">
              <span className={cn("text-sm", isToday ? "font-medium text-brand" : "text-ink-3")}>
                周{weekdayShort(day)}
              </span>
              <span
                className={cn(
                  "tabular ml-auto flex size-7 items-center justify-center rounded-full text-sm",
                  isToday ? "bg-brand font-semibold text-white" : "text-ink-2",
                )}
              >
                {dayOfMonth(day)}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-1.5 p-1.5">
              {ofDay.length === 0 ? (
                <span className="px-1 pt-1 text-sm text-ink-3/70">无课</span>
              ) : (
                ofDay.map((lesson) => <LessonBlock key={lesson.id} lesson={lesson} compact />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
