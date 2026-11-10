import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SubjectSwatch, SubjectTag } from "@/components/subject-mark";
import { LessonBlock } from "@/components/site/lesson-block";
import { NotesTimeline } from "@/components/site/notes-timeline";
import { AssignmentList, RedPenHeading } from "@/components/site/red-pen";
import { WeekGrid, WeekStrip } from "@/components/site/week";
import {
  getStudent,
  listLessonsBetween,
  listRecentAssignments,
  listRecentNotes,
  listSubjectsWithStats,
} from "@/lib/queries";
import {
  addDays,
  formatMonthDay,
  formatRelativeDate,
  formatWeekRange,
  isDateString,
  todayKey,
  weekDays,
  weekStart,
} from "@/lib/time";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const today = todayKey();
  const start = weekStart(today);
  const days = weekDays(start);
  const selected =
    isDateString(params.d as string) && days.includes(params.d as string) ? (params.d as string) : today;

  const student = getStudent();
  const lessons = listLessonsBetween(start, addDays(start, 6));
  const dayLessons = lessons.filter((lesson) => lesson.date === selected);
  const assignments = listRecentAssignments(today);
  const notes = listRecentNotes(4);
  const subjects = listSubjectsWithStats(today);
  const weekCount = lessons.filter((lesson) => lesson.status !== "cancelled").length;
  const doneCount = lessons.filter((lesson) => lesson.status === "done").length;

  return (
    <>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{student.name}的学习档案</h1>
        <p className="mt-1.5 text-ink-2">
          {[student.grade, student.intro].filter(Boolean).join("，") ||
            `本周 ${weekCount} 节课，已上 ${doneCount} 节`}
        </p>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:gap-y-12">
        <section aria-labelledby="week-heading" className="xl:col-start-1 xl:row-start-1">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 id="week-heading" className="text-lg font-semibold text-ink">
              本周课程
            </h2>
            <span className="tabular text-sm text-ink-3">{formatWeekRange(start)}</span>
            <Link
              href="/schedule"
              className="ml-auto inline-flex items-center text-sm font-medium text-brand hover:underline"
            >
              完整课表
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="lg:hidden">
            <div className="-mx-4 border-y border-rule bg-surface px-2 py-1.5 sm:mx-0 sm:rounded-lg sm:border">
              <WeekStrip
                days={days}
                today={today}
                selected={selected}
                lessons={lessons}
                hrefFor={(day) => (day === today ? "/" : `/?d=${day}`)}
              />
            </div>
            <h3 className="mt-5 mb-2.5 text-[0.9375rem] font-medium text-ink-2">
              {formatRelativeDate(selected, today)}
              {dayLessons.length > 0 ? `，${dayLessons.length} 节课` : ""}
            </h3>
            {dayLessons.length === 0 ? (
              <p className="rounded-md border border-dashed border-rule-strong px-4 py-5 text-ink-3">
                这天没有课。点上面的日期看看其他天。
              </p>
            ) : (
              <div className="space-y-2">
                {dayLessons.map((lesson) => (
                  <LessonBlock key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <WeekGrid days={days} today={today} lessons={lessons} />
          </div>
        </section>

        <aside className="grid content-start gap-10 lg:grid-cols-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:grid-cols-1">
          <section aria-labelledby="assign-heading">
            <div id="assign-heading">
              <RedPenHeading>老师最近布置</RedPenHeading>
            </div>
            {assignments.length === 0 ? (
              <p className="mt-4 text-ink-3">最近两周老师还没有布置作业或课前准备。</p>
            ) : (
              <div className="mt-4 divide-y divide-rule rounded-lg border border-rule bg-surface">
                {assignments.map((lesson) => (
                  <article key={lesson.id} className="px-4 pt-3 pb-2">
                    <Link
                      href={`/lessons/${lesson.id}`}
                      className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink"
                    >
                      <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                      <span className="tabular">{formatMonthDay(lesson.date)}布置</span>
                      <ChevronRight className="ml-auto size-4" />
                    </Link>
                    <AssignmentList homework={lesson.homework} prep={lesson.prep} className="mt-1" />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="text-lg font-semibold text-ink">
              最近课程纪要
            </h2>
            {notes.length === 0 ? (
              <p className="mt-3 text-ink-3">上完课后，老师的总结会出现在这里。</p>
            ) : (
              <div className="mt-2">
                <NotesTimeline lessons={notes} excerptLength={60} />
              </div>
            )}
          </section>
        </aside>

        <section aria-labelledby="subjects-heading" className="xl:col-start-1 xl:row-start-2 xl:self-start">
          <h2 id="subjects-heading" className="text-lg font-semibold text-ink">
            科目
          </h2>
          <ul className="mt-3 grid border-t border-rule sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            {subjects.map((subject) => (
              <li key={subject.id} className="border-b border-rule">
                <Link
                  href={`/subjects/${subject.slug}`}
                  className="group flex items-center gap-3 py-3.5"
                >
                  <SubjectSwatch hue={subject.hue} className="size-3" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-semibold text-ink">{subject.name}</span>
                      <span className="truncate text-sm text-ink-2">
                        {subject.teacherName || "老师待定"}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-3">
                      {subject.materialCount > 0 ? `资料 ${subject.materialCount} 册` : "暂无资料"}
                      {subject.nextLessonDate ? `，下节 ${formatMonthDay(subject.nextLessonDate)}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

    </>
  );
}
