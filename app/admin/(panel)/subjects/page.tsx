import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectSwatch } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { listSubjectsWithStats } from "@/lib/queries";
import { formatMonthDay, todayKey } from "@/lib/time";

export const metadata: Metadata = { title: "科目与老师" };

export default function SubjectsAdminPage() {
  const subjects = listSubjectsWithStats(todayKey());
  const missingTeacher = subjects.filter((subject) => !subject.teacherName).length;

  return (
    <>
      <PageHeader
        title="科目与老师"
        description={
          missingTeacher > 0
            ? `还有 ${missingTeacher} 个科目没填老师称呼，填好后家长端会显示。`
            : "每个科目的任课老师、整体规划和排课设置。"
        }
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/subjects/new">
              <Plus />
              添加科目
            </Link>
          </Button>
        }
      />
      <ul className="divide-y divide-rule border-y border-rule">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <Link
              href={`/admin/subjects/${subject.id}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-3 hover:bg-surface sm:grid-cols-[auto_8rem_10rem_1fr_auto]"
            >
              <SubjectSwatch hue={subject.hue} className="size-3" />
              <span className="font-medium text-ink">{subject.name}</span>
              <span className={subject.teacherName ? "text-ink-2" : "text-mark"}>
                {subject.teacherName || "未填老师"}
              </span>
              <span className="col-start-2 col-end-4 text-sm text-ink-3 sm:col-auto">
                {subject.materialCount} 册资料，已上 {subject.doneCount} 节
                {subject.planMd ? "，有规划" : ""}
              </span>
              <span className="hidden text-sm text-ink-3 sm:block">
                {subject.nextLessonDate ? `下节 ${formatMonthDay(subject.nextLessonDate)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
