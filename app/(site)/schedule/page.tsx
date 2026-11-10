import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { LessonBlock } from "@/components/site/lesson-block";
import { WeekGrid } from "@/components/site/week";
import { Button } from "@/components/ui/button";
import { listLessonsBetween } from "@/lib/queries";
import {
  addDays,
  formatRelativeDate,
  formatWeekRange,
  isDateString,
  todayKey,
  weekDays,
  weekStart,
} from "@/lib/time";

export const metadata: Metadata = { title: "课表" };

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const params = await searchParams;
  const today = todayKey();
  const anchor = isDateString(params.w as string) ? (params.w as string) : today;
  const start = weekStart(anchor);
  const days = weekDays(start);
  const lessons = listLessonsBetween(start, addDays(start, 6));
  const thisWeek = weekStart(today);
  const active = lessons.filter((lesson) => lesson.status !== "cancelled");

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold text-ink">课表</h1>
        <div className="flex items-center gap-1 sm:ml-auto">
          <Button asChild variant="ghost" size="icon-sm" aria-label="上一周">
            <Link href={`/schedule?w=${addDays(start, -7)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="tabular min-w-40 text-center font-medium text-ink">{formatWeekRange(start)}</span>
          <Button asChild variant="ghost" size="icon-sm" aria-label="下一周">
            <Link href={`/schedule?w=${addDays(start, 7)}`}>
              <ChevronRight />
            </Link>
          </Button>
          {start !== thisWeek ? (
            <Button asChild variant="outline" size="sm" className="ml-1">
              <Link href="/schedule">本周</Link>
            </Button>
          ) : null}
        </div>
      </header>
      <p className="mb-5 text-ink-2">
        {active.length === 0 ? "这一周还没有排课。" : `这一周共 ${active.length} 节课。点一节课可以看纪要。`}
      </p>

      <div className="hidden lg:block">
        <WeekGrid days={days} today={today} lessons={lessons} />
      </div>

      <div className="space-y-6 lg:hidden">
        {days.map((day) => {
          const ofDay = lessons.filter((lesson) => lesson.date === day);
          return (
            <section key={day} aria-label={formatRelativeDate(day, today)}>
              <h2
                className={cn(
                  "mb-2 text-[0.9375rem] font-medium",
                  day === today ? "text-brand" : "text-ink-2",
                )}
              >
                {formatRelativeDate(day, today)}
              </h2>
              {ofDay.length === 0 ? (
                <p className="border-t border-rule pt-2 text-sm text-ink-3">无课</p>
              ) : (
                <div className="space-y-2">
                  {ofDay.map((lesson) => (
                    <LessonBlock key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
