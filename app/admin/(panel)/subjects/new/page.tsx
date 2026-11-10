import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { listSubjects } from "@/lib/queries";
import { SUBJECT_HUES } from "@/lib/subjects";
import { SubjectForm } from "../subject-form";

export const metadata: Metadata = { title: "添加科目" };

export default function NewSubjectPage() {
  const subjects = listSubjects();
  const usedHues = new Set(subjects.map((subject) => subject.hue));
  const hue = SUBJECT_HUES.find((value) => !usedHues.has(value)) ?? SUBJECT_HUES[0];

  return (
    <>
      <PageHeader title="添加科目" back={{ href: "/admin/subjects", label: "全部科目" }} />
      <SubjectForm
        subjectId={null}
        initial={{
          name: "",
          hue,
          sortOrder: subjects.length,
          teacherName: "",
          teacherNote: "",
          planMd: "",
          weeklyLessons: 1,
          lessonMinutes: 90,
        }}
      />
    </>
  );
}
