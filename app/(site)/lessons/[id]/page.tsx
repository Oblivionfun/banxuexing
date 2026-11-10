import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { SubjectTag } from "@/components/subject-mark";
import { FileRows } from "@/components/site/file-rows";
import { Gallery } from "@/components/site/gallery";
import { hasNotes } from "@/components/site/lesson-block";
import { Markdown } from "@/components/site/markdown";
import { AssignmentList, RedPenHeading } from "@/components/site/red-pen";
import { WeChatDownloadHint } from "@/components/site/wechat-hint";
import { lessonSourceLabel, lessonStatusLabel } from "@/lib/labels";
import { getLesson, listLessonsForSubject } from "@/lib/queries";
import { formatDateTime, formatMonthDay, formatRelativeDate, formatTimeRange, todayKey } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/lessons/[id]">): Promise<Metadata> {
  const { id } = await params;
  const found = getLesson(Number(id));
  return { title: found ? `${found.lesson.subject.name} ${formatMonthDay(found.lesson.date)}` : "课程纪要" };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const found = getLesson(Number(id));
  if (!found) notFound();
  const { lesson, files } = found;
  const today = todayKey();

  const siblings = listLessonsForSubject(lesson.subjectId).filter(
    (item) => item.status === "done" || item.id === lesson.id,
  );
  const position = siblings.findIndex((item) => item.id === lesson.id);
  const newer = position > 0 ? siblings[position - 1] : undefined;
  const older = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined;

  const images = files
    .filter((file) => file.kind === "image")
    .map(({ id: fileId, originalName, width, height }) => ({ id: fileId, name: originalName, width, height }));
  const others = files.filter((file) => file.kind !== "image");
  const notes = hasNotes(lesson);
  const assigned = Boolean(lesson.homework || lesson.prep);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href={`/subjects/${lesson.subject.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        {lesson.subject.name}的全部纪要
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
          <span className="text-sm text-ink-3">{lessonStatusLabel(lesson.status)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">
          {lesson.topic || `${lesson.subject.name}课`}
        </h1>
        <p className="tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
          <span>{formatRelativeDate(lesson.date, today)}</span>
          <span>{formatTimeRange(lesson.startTime, lesson.endTime)}</span>
          {lesson.subject.teacherName ? <span>{lesson.subject.teacherName}</span> : null}
        </p>
      </header>

      {lesson.status === "cancelled" ? (
        <p className="mt-8 rounded-md bg-secondary px-4 py-3 text-ink-2">这节课已取消。</p>
      ) : !notes && lesson.status === "planned" ? (
        <p className="mt-8 rounded-md border border-dashed border-rule-strong px-4 py-5 text-ink-2">
          这节课还没上。上完课后，老师的总结和布置会出现在这里。
        </p>
      ) : !notes ? (
        <p className="mt-8 rounded-md border border-dashed border-rule-strong px-4 py-5 text-ink-2">
          老师的总结还在整理中，稍后再来看看。
        </p>
      ) : null}

      {assigned ? (
        <section className="mt-8 rounded-lg border border-rule bg-surface px-4 pt-4 pb-3 sm:px-6">
          <RedPenHeading>老师布置</RedPenHeading>
          <AssignmentList homework={lesson.homework} prep={lesson.prep} className="mt-3" />
        </section>
      ) : null}

      {lesson.summaryMd ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink">本节内容</h2>
          <Markdown className="mt-3 max-w-[68ch]">{lesson.summaryMd}</Markdown>
        </section>
      ) : null}

      {lesson.recordingUrl ? (
        <a
          href={lesson.recordingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-8 flex items-center gap-3 rounded-lg border border-rule bg-surface px-4 py-3 hover:border-brand"
        >
          <PlayCircle className="size-6 text-brand" aria-hidden />
          <span className="flex-1">
            <span className="block font-medium text-ink">腾讯会议回放</span>
            <span className="block text-sm text-ink-3">在腾讯会议里打开这节课的录制</span>
          </span>
          <ChevronRight className="size-4 text-ink-3" />
        </a>
      ) : null}

      {files.length > 0 ? (
        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-ink">课堂附件</h2>
          {others.length > 0 ? <WeChatDownloadHint /> : null}
          {images.length > 0 ? <Gallery images={images} /> : null}
          <FileRows files={others} />
        </section>
      ) : null}

      {notes ? (
        <p className="mt-10 text-sm text-ink-3">
          来源：{lessonSourceLabel(lesson.source)}，更新于 {formatDateTime(lesson.updatedAt)}
        </p>
      ) : null}

      {newer || older ? (
        <nav aria-label="同科目的其他纪要" className="mt-8 grid grid-cols-2 gap-3 border-t border-rule pt-5">
          {older ? (
            <Link href={`/lessons/${older.id}`} className="group">
              <span className="flex items-center gap-1 text-sm text-ink-3">
                <ChevronLeft className="size-4" />
                上一节
              </span>
              <span className="mt-0.5 block truncate text-ink group-hover:text-brand">
                {formatMonthDay(older.date)} {older.topic}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/lessons/${newer.id}`} className="group text-right">
              <span className="flex items-center justify-end gap-1 text-sm text-ink-3">
                下一节
                <ChevronRight className="size-4" />
              </span>
              <span className="mt-0.5 block truncate text-ink group-hover:text-brand">
                {formatMonthDay(newer.date)} {newer.topic}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </article>
  );
}
