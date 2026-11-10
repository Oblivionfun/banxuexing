import Link from "next/link";
import { CalendarPlus, NotebookPen, Upload } from "lucide-react";
import { CopyButton } from "@/components/admin/buttons";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectTag } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { shareUrl } from "@/lib/auth";
import { lessonStatusLabel } from "@/lib/labels";
import { getStudent, listActivity, listLessonsBetween } from "@/lib/queries";
import { addDays, formatDateTime, formatRelativeDate, formatTimeRange, todayKey } from "@/lib/time";

export default function AdminHome() {
  const today = todayKey();
  const student = getStudent();
  const upcoming = listLessonsBetween(today, addDays(today, 1)).filter(
    (lesson) => lesson.status !== "cancelled",
  );
  const missingNotes = listLessonsBetween(addDays(today, -14), today).filter(
    (lesson) =>
      lesson.status !== "cancelled" &&
      (lesson.date < today || lesson.status === "done") &&
      !lesson.summaryMd &&
      !lesson.homework &&
      !lesson.prep,
  );
  const activity = listActivity(12);
  const link = shareUrl();

  return (
    <>
      <PageHeader
        title={`${student.name}的学习档案`}
        description="工作人员在这里上传资料、录入纪要和排课。家长和老师用下面的链接查看。"
      />

      <section className="rounded-lg border border-rule bg-surface p-4 sm:p-5">
        <h2 className="font-semibold text-ink">家长和老师的查看链接</h2>
        <p className="mt-1 text-sm text-ink-3">
          发到微信群即可。点开一次后，这台手机之后可以直接访问。
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md bg-paper px-3 py-2 text-sm text-ink-2">
            {link}
          </code>
          <CopyButton value={link} />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button asChild size="lg">
          <Link href="/admin/upload">
            <Upload />
            上传资料
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/admin/lessons?filter=notes">
            <NotebookPen />
            录入课程纪要
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/admin/lessons/new">
            <CalendarPlus />
            添加课程
          </Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-ink">待补纪要</h2>
          <p className="mt-1 text-sm text-ink-3">最近两周已经上过、但还没有写纪要的课</p>
          {missingNotes.length === 0 ? (
            <p className="mt-4 text-ink-2">都写好了。</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {missingNotes.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/admin/lessons/${lesson.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-surface"
                  >
                    <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                    <span className="tabular text-ink-2">
                      {formatRelativeDate(lesson.date, today)}{" "}
                      {formatTimeRange(lesson.startTime, lesson.endTime)}
                    </span>
                    <span className="ml-auto text-sm font-medium text-brand">写纪要</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 text-lg font-semibold text-ink">今天和明天的课</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-ink-2">
              今天和明天没有排课。
              <Link href="/admin/lessons/new" className="ml-1 text-brand underline">
                添加课程
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {upcoming.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/admin/lessons/${lesson.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-surface"
                  >
                    <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                    <span className="tabular text-ink-2">
                      {formatRelativeDate(lesson.date, today)}{" "}
                      {formatTimeRange(lesson.startTime, lesson.endTime)}
                    </span>
                    <span className="ml-auto text-sm text-ink-3">
                      {lessonStatusLabel(lesson.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">最近操作</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-ink-2">还没有任何操作。先上传一份资料试试。</p>
          ) : (
            <ol className="mt-3 divide-y divide-rule border-y border-rule">
              {activity.map((entry) => (
                <li key={entry.id} className="flex gap-4 py-2.5 text-[0.9375rem]">
                  <time className="tabular w-28 shrink-0 text-sm text-ink-3">
                    {formatDateTime(entry.at)}
                  </time>
                  <span className="text-ink-2">{entry.summary}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
