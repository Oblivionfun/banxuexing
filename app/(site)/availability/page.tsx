import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { AvailabilityEditor } from "@/components/availability-editor";
import { SubjectSwatch } from "@/components/subject-mark";
import { getStudent, listAvailability, listSubjects } from "@/lib/queries";
import { weekdayNameFromIso } from "@/lib/time";
import { teacherAddWindowAction, teacherRemoveWindowAction } from "./actions";

export const metadata: Metadata = { title: "填写可上课时间" };

export default async function AvailabilityPage({ searchParams }: PageProps<"/availability">) {
  const { subject: slug } = await searchParams;
  const subjects = listSubjects();
  const subject = subjects.find((item) => item.slug === slug);
  const windows = listAvailability();
  const student = getStudent();
  const studentWindows = windows.filter((row) => row.ownerType === "student");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">老师可上课时间</h1>
      <p className="mt-2 text-ink-2">
        请选择您教的科目，填上每周固定有空的时间段。工作人员会按大家的时间排出不冲突的课表。
      </p>

      {studentWindows.length > 0 ? (
        <p className="mt-4 rounded-md bg-brand-tint px-4 py-3 text-[0.9375rem] text-brand-hover">
          {student.name}每周可以上课的时间：
          {studentWindows
            .map((row) => `${weekdayNameFromIso(row.weekday)} ${row.startTime}–${row.endTime}`)
            .join("，")}
        </p>
      ) : null}

      <nav aria-label="选择科目" className="mt-6 flex flex-wrap gap-2">
        {subjects.map((item) => (
          <Link
            key={item.id}
            href={`/availability?subject=${item.slug}`}
            scroll={false}
            aria-current={item.id === subject?.id ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-[0.9375rem] transition-colors duration-150",
              item.id === subject?.id
                ? "border-brand bg-brand-tint font-medium text-brand"
                : "border-rule-strong bg-surface text-ink hover:border-ink-3",
            )}
          >
            <SubjectSwatch hue={item.hue} />
            {item.name}
          </Link>
        ))}
      </nav>

      {subject ? (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="text-lg font-semibold text-ink">
            {subject.name}
            {subject.teacherName ? `（${subject.teacherName}）` : ""}
          </h2>
          <p className="mt-1 mb-4 text-sm text-ink-3">
            每周 {subject.weeklyLessons} 节，每节 {subject.lessonMinutes} 分钟。添加后立即保存。
          </p>
          <AvailabilityEditor
            windows={windows.filter((row) => row.subjectId === subject.id)}
            addAction={teacherAddWindowAction.bind(null, subject.id)}
            removeAction={teacherRemoveWindowAction.bind(null, subject.id)}
            emptyText="还没有填写，请在下面添加。"
          />
        </section>
      ) : (
        <p className="mt-8 text-ink-3">先点上面您教的科目。</p>
      )}
    </div>
  );
}
