import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { listMaterialSets, listSubjects } from "@/lib/queries";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "上传资料" };

export default async function UploadPage({ searchParams }: PageProps<"/admin/upload">) {
  const params = await searchParams;
  const subjects = listSubjects().map(({ id, name, hue, slug }) => ({ id, name, hue, slug }));
  const sets = listMaterialSets().map(({ id, title, subjectId, category, fileCount }) => ({
    id,
    title,
    subjectId,
    category,
    fileCount,
  }));
  const initialSetId = Number(params.set) || undefined;
  const initialSubject =
    subjects.find((subject) => subject.slug === params.subject)?.id ??
    sets.find((set) => set.id === initialSetId)?.subjectId;

  return (
    <>
      <PageHeader
        title="上传资料"
        description="学生的课本照片、试卷、考试材料都可以传到这里，老师和家长打开链接就能看到、下载。"
      />
      <UploadForm
        subjects={subjects}
        sets={sets}
        initialSubjectId={initialSubject}
        initialSetId={initialSetId}
      />
    </>
  );
}
