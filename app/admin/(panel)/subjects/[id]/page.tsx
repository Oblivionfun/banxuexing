import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/buttons";
import { PageHeader } from "@/components/admin/page-header";
import { getSubjectById } from "@/lib/queries";
import { deleteSubjectAction } from "../../../actions";
import { SubjectForm } from "../subject-form";

export const metadata: Metadata = { title: "编辑科目" };

export default async function EditSubjectPage({ params, searchParams }: PageProps<"/admin/subjects/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const subject = getSubjectById(Number(id));
  if (!subject) notFound();

  return (
    <>
      <PageHeader
        title={subject.name}
        description={saved ? "科目已添加。" : undefined}
        back={{ href: "/admin/subjects", label: "全部科目" }}
      />
      <SubjectForm
        key={subject.planUpdatedAt?.getTime() ?? 0}
        subjectId={subject.id}
        initial={{
          name: subject.name,
          hue: subject.hue,
          sortOrder: subject.sortOrder,
          teacherName: subject.teacherName,
          teacherNote: subject.teacherNote,
          planMd: subject.planMd,
          weeklyLessons: subject.weeklyLessons,
          lessonMinutes: subject.lessonMinutes,
        }}
      />
      <section className="mt-12 max-w-2xl border-t border-rule pt-8">
        <h2 className="text-lg font-semibold text-ink">删除科目</h2>
        <p className="mt-1 text-sm text-ink-3">只有没有任何课程和资料的科目才能删除。</p>
        <div className="mt-4">
          <ActionButton
            action={deleteSubjectAction.bind(null, subject.id)}
            variant="destructive"
            confirm={{
              title: `删除「${subject.name}」？`,
              description: "删除后不能恢复。",
              confirmText: "删除",
            }}
          >
            <Trash2 />
            删除科目
          </ActionButton>
        </div>
      </section>
    </>
  );
}
