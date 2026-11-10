import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/buttons";
import { AttachUploader } from "@/components/admin/attach-uploader";
import { AdminFileList } from "@/components/admin/file-list";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { isAiConfigured } from "@/lib/env";
import { getLesson, listSubjects } from "@/lib/queries";
import { formatDateTime, formatDateWithWeekday } from "@/lib/time";
import { deleteLessonAction } from "../../../actions";
import { NotifyButton } from "../../notify-button";
import { LessonForm } from "../lesson-form";

export const metadata: Metadata = { title: "编辑课程" };

export default async function EditLessonPage({ params, searchParams }: PageProps<"/admin/lessons/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const found = getLesson(Number(id));
  if (!found) notFound();
  const { lesson, files } = found;
  const subjects = listSubjects();
  const hasNotes = Boolean(lesson.summaryMd || lesson.homework || lesson.prep);

  return (
    <>
      <PageHeader
        title={`${lesson.subject.name} ${formatDateWithWeekday(lesson.date)}`}
        description={
          saved
            ? "已保存。上完课后回来补上纪要，家长就能看到。"
            : `${lesson.startTime}–${lesson.endTime}${lesson.subject.teacherName ? `，${lesson.subject.teacherName}` : ""}`
        }
        back={{ href: `/admin/lessons?w=${lesson.date}`, label: "返回课表" }}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/lessons/${lesson.id}`}>
                <ExternalLink />
                家长端效果
              </Link>
            </Button>
            {hasNotes ? <NotifyButton kind="lesson" id={lesson.id} notifiedAt={lesson.notifiedAt} /> : null}
          </>
        }
      />
      {lesson.notifiedAt ? (
        <p className="-mt-5 mb-6 text-sm text-ink-3">上次推送到群：{formatDateTime(lesson.notifiedAt)}</p>
      ) : null}

      <LessonForm
        key={lesson.updatedAt.getTime()}
        lessonId={lesson.id}
        aiEnabled={isAiConfigured()}
        subjects={subjects.map(({ id: sid, name, hue, lessonMinutes }) => ({ id: sid, name, hue, lessonMinutes }))}
        initial={{
          subjectId: lesson.subjectId,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          status: lesson.status,
          topic: lesson.topic,
          summaryMd: lesson.summaryMd,
          homework: lesson.homework,
          prep: lesson.prep,
          planMd: lesson.planMd,
          planPrep: lesson.planPrep,
          recordingUrl: lesson.recordingUrl,
          source: lesson.source,
        }}
      />

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold text-ink">课堂附件</h2>
        <p className="mt-1 text-sm text-ink-3">
          课堂板书、批改过的作业、录音等。家长在这节课的纪要里能看到。
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <AdminFileList files={files} />
          <AttachUploader target={{ lessonId: lesson.id }} startLabel="上传附件" />
        </div>
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold text-ink">删除这节课</h2>
        <p className="mt-1 text-sm text-ink-3">删除后会进入回收站，需要时可以恢复。</p>
        <div className="mt-4">
          <ActionButton
            action={deleteLessonAction.bind(null, lesson.id)}
            variant="destructive"
            confirm={{
              title: "删除这节课？",
              description: "家长端将不再显示这节课和它的纪要。可以在回收站恢复。",
              confirmText: "删除",
            }}
          >
            <Trash2 />
            删除这节课
          </ActionButton>
        </div>
      </section>
    </>
  );
}
