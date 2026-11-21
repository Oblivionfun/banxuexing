import type { Metadata } from "next";
import { SubjectList } from "@/components/site/subject-list";
import { listSubjectsWithStats } from "@/lib/queries";
import { todayKey } from "@/lib/time";

export const metadata: Metadata = { title: "科目" };

export default function SubjectsPage() {
  const subjects = listSubjectsWithStats(todayKey());

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">科目</h1>
        <p className="mt-1.5 text-ink-2">
          共 {subjects.length} 个科目。点开可以看课程纪要、资料、老师规划和老师介绍。
        </p>
      </header>
      <SubjectList subjects={subjects} />
    </>
  );
}
