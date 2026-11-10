import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { isAiConfigured } from "@/lib/env";
import { listSubjects } from "@/lib/queries";
import { isDateString, todayKey } from "@/lib/time";
import { LessonForm } from "../lesson-form";

export const metadata: Metadata = { title: "添加课程" };

export default async function NewLessonPage({ searchParams }: PageProps<"/admin/lessons/new">) {
  const params = await searchParams;
  const subjects = listSubjects();
  const date = isDateString(params.date as string) ? (params.date as string) : todayKey();
  const subject = subjects.find((item) => item.slug === params.subject);

  return (
    <>
      <PageHeader
        title="添加课程"
        description="先排好时间；上完课后再回来写纪要，也可以现在就把老师的总结一起填上。"
        back={{ href: `/admin/lessons?w=${date}`, label: "返回课表" }}
      />
      <LessonForm
        lessonId={null}
        aiEnabled={isAiConfigured()}
        subjects={subjects.map(({ id, name, hue, lessonMinutes }) => ({ id, name, hue, lessonMinutes }))}
        initial={{
          subjectId: subject?.id,
          date,
          startTime: "",
          endTime: "",
          status: "planned",
          topic: "",
          summaryMd: "",
          homework: "",
          prep: "",
          planMd: "",
          planPrep: "",
          recordingUrl: "",
          source: "manual",
        }}
      />
    </>
  );
}
