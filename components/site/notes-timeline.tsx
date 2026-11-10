import Link from "next/link";
import { cn } from "cn";
import { SubjectTag } from "@/components/subject-mark";
import { splitItems } from "@/lib/labels";
import type { LessonWithSubject } from "@/lib/queries";
import { formatMonthDay, weekdayName } from "@/lib/time";
import { plainExcerpt } from "@/lib/text";

/** 课程纪要时间线：纪要本身就是按时间发生的，左侧是日期，右侧是内容摘要。 */
export function NotesTimeline({
  lessons,
  showSubject = true,
  excerptLength = 90,
}: {
  lessons: LessonWithSubject[];
  showSubject?: boolean;
  excerptLength?: number;
}) {
  return (
    <ol className="relative">
      {lessons.map((lesson, index) => {
        const assigned = splitItems(lesson.homework).length + splitItems(lesson.prep).length;
        return (
          <li key={lesson.id} className="relative grid grid-cols-[4.5rem_1fr] gap-x-3">
            <div className="relative pt-3.5 text-right">
              <span className="tabular block text-sm font-medium text-ink">{formatMonthDay(lesson.date)}</span>
              <span className="block text-xs text-ink-3">{weekdayName(lesson.date)}</span>
            </div>
            <Link
              href={`/lessons/${lesson.id}`}
              className={cn(
                "group relative block border-l border-rule py-3 pl-4",
                index === lessons.length - 1 && "pb-1",
              )}
            >
              <span
                aria-hidden
                className="absolute top-[1.2rem] -left-[4.5px] size-2 rounded-full border border-surface bg-rule-strong group-hover:bg-brand"
              />
              <span className="flex flex-wrap items-center gap-2">
                {showSubject ? <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} /> : null}
                {lesson.topic ? <span className="font-medium text-ink">{lesson.topic}</span> : null}
              </span>
              {lesson.summaryMd ? (
                <span className="mt-1.5 line-clamp-3 block text-base leading-relaxed text-ink-2">
                  {plainExcerpt(lesson.summaryMd, excerptLength)}
                </span>
              ) : null}
              {assigned > 0 ? (
                <span className="mt-1.5 block text-sm font-medium text-mark">老师布置了 {assigned} 项</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
