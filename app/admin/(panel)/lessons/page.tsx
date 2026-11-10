import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "cn";
import { ActionButton } from "@/components/admin/buttons";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectTag } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { lessonStatusLabel } from "@/lib/labels";
import { hasNotes } from "@/lib/lesson";
import { listLessonsBetween, type LessonWithSubject } from "@/lib/queries";
import {
  addDays,
  formatDateWithWeekday,
  formatRelativeDate,
  formatTimeRange,
  formatWeekRange,
  isDateString,
  todayKey,
  weekDays,
  weekStart,
} from "@/lib/time";
import { copyWeekAction } from "../../actions";

export const metadata: Metadata = { title: "课程与纪要" };

function LessonRow({ lesson, today }: { lesson: LessonWithSubject; today: string }) {
  const needsNotes = lesson.status !== "cancelled" && lesson.date <= today && !hasNotes(lesson);
  return (
    <li>
      <Link
        href={`/admin/lessons/${lesson.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-surface sm:flex-nowrap"
      >
        <span
          className={cn(
            "tabular w-28 shrink-0 text-ink-2",
            lesson.status === "cancelled" && "text-ink-3 line-through",
          )}
        >
          {formatTimeRange(lesson.startTime, lesson.endTime)}
        </span>
        <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
        <span className="min-w-0 flex-1 truncate text-ink">{lesson.topic}</span>
        <span className="text-sm text-ink-3">{lessonStatusLabel(lesson.status)}</span>
        <span
          className={cn(
            "w-20 text-right text-sm font-medium",
            needsNotes ? "text-mark" : hasNotes(lesson) ? "text-success" : "text-ink-3",
          )}
        >
          {needsNotes ? "待写纪要" : hasNotes(lesson) ? "纪要已写" : ""}
        </span>
      </Link>
    </li>
  );
}

export default async function LessonsPage({ searchParams }: PageProps<"/admin/lessons">) {
  const params = await searchParams;
  const today = todayKey();
  const filter = params.filter === "notes" ? "notes" : "week";

  if (filter === "notes") {
    const recent = listLessonsBetween(addDays(today, -28), today)
      .filter((lesson) => lesson.status !== "cancelled")
      .reverse();
    const pending = recent.filter((lesson) => !hasNotes(lesson));
    const written = recent.filter(hasNotes).slice(0, 10);
    return (
      <>
        <PageHeader
          title="录入课程纪要"
          description="选一节已经上过的课，把老师的总结粘贴进去。"
          back={{ href: "/admin/lessons", label: "返回课表" }}
        />
        <h2 className="text-lg font-semibold text-ink">还没写纪要的课</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-ink-2">最近四周的课都写好纪要了。</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {pending.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/admin/lessons/${lesson.id}`}
                  className="flex flex-wrap items-center gap-3 py-3 hover:bg-surface"
                >
                  <span className="tabular w-40 text-ink-2">
                    {formatRelativeDate(lesson.date, today)} {lesson.startTime}
                  </span>
                  <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                  <span className="ml-auto text-sm font-medium text-brand">写纪要</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-ink-3">
          找不到这节课？
          <Link href={`/admin/lessons/new?date=${today}`} className="ml-1 text-brand underline">
            先补录这节课
          </Link>
        </p>
        {written.length > 0 ? (
          <>
            <h2 className="mt-10 text-lg font-semibold text-ink">最近写好的</h2>
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {written.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/admin/lessons/${lesson.id}`}
                    className="flex flex-wrap items-center gap-3 py-3 hover:bg-surface"
                  >
                    <span className="tabular w-40 text-ink-2">
                      {formatRelativeDate(lesson.date, today)} {lesson.startTime}
                    </span>
                    <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                    <span className="min-w-0 flex-1 truncate text-ink">{lesson.topic}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </>
    );
  }

  const anchor = isDateString(params.w as string) ? (params.w as string) : today;
  const start = weekStart(anchor);
  const days = weekDays(start);
  const lessons = listLessonsBetween(start, addDays(start, 6));
  const thisWeek = weekStart(today);

  return (
    <>
      <PageHeader
        title="课程与纪要"
        description="排课、改时间、写纪要都在这里。点一节课进去编辑。"
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/lessons?filter=notes">录入纪要</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/lessons/new?date=${start === thisWeek ? today : start}`}>
                <Plus />
                添加课程
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm" aria-label="上一周">
            <Link href={`/admin/lessons?w=${addDays(start, -7)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="tabular min-w-44 text-center font-semibold text-ink">{formatWeekRange(start)}</h2>
          <Button asChild variant="ghost" size="icon-sm" aria-label="下一周">
            <Link href={`/admin/lessons?w=${addDays(start, 7)}`}>
              <ChevronRight />
            </Link>
          </Button>
          {start !== thisWeek ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/lessons">回到本周</Link>
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            action={copyWeekAction.bind(null, addDays(start, -7), start)}
            confirm={{
              title: "把上一周的课表复制到这一周？",
              description: "会按上一周的科目和时间新增“待上课”的课程，这一周已有的同一节课不会重复添加。",
              confirmText: "复制",
            }}
          >
            复制上周课表到这周
          </ActionButton>
          <ActionButton
            action={copyWeekAction.bind(null, start, addDays(start, 7))}
            confirm={{
              title: "把这一周的课表复制到下一周？",
              description: "会按这一周的科目和时间新增“待上课”的课程，下一周已有的同一节课不会重复添加。",
              confirmText: "复制",
            }}
          >
            复制这周课表到下周
          </ActionButton>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="py-12">
          <p className="text-ink-2">这一周还没有排课。</p>
          <p className="mt-1 text-sm text-ink-3">可以逐节添加，或者用上面的按钮从上一周复制。</p>
        </div>
      ) : (
        <div className="mt-2">
          {days.map((day) => {
            const ofDay = lessons.filter((lesson) => lesson.date === day);
            if (ofDay.length === 0) return null;
            return (
              <section key={day} className="pt-5">
                <h3 className={cn("text-sm font-medium", day === today ? "text-brand" : "text-ink-3")}>
                  {day === today ? "今天 " : ""}
                  {formatDateWithWeekday(day)}
                </h3>
                <ul className="mt-1 divide-y divide-rule border-y border-rule">
                  {ofDay.map((lesson) => (
                    <LessonRow key={lesson.id} lesson={lesson} today={today} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
