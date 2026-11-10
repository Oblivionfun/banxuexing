import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";
import { SubjectSwatch } from "@/components/subject-mark";
import { LessonBlock } from "@/components/site/lesson-block";
import { Markdown } from "@/components/site/markdown";
import { MaterialGrid } from "@/components/site/material-grid";
import { NotesTimeline } from "@/components/site/notes-timeline";
import { MATERIAL_CATEGORIES } from "@/lib/enums";
import { materialCategoryLabel } from "@/lib/labels";
import { getSubjectBySlug, listLessonsForSubject, listMaterialSets } from "@/lib/queries";
import { subjectStyle } from "@/lib/subjects";
import { formatDateTime, formatRelativeDate, todayKey } from "@/lib/time";

const TABS = [
  { key: "notes", label: "课程纪要" },
  { key: "materials", label: "资料" },
  { key: "plan", label: "老师规划" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export async function generateMetadata({ params }: PageProps<"/subjects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getSubjectBySlug(slug)?.name ?? "科目" };
}

export default async function SubjectPage({ params, searchParams }: PageProps<"/subjects/[slug]">) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const subject = getSubjectBySlug(slug);
  if (!subject) notFound();
  const tab: TabKey = TABS.some((item) => item.key === rawTab) ? (rawTab as TabKey) : "notes";

  const today = todayKey();
  const lessons = listLessonsForSubject(subject.id);
  const sets = listMaterialSets(subject.id);
  const upcoming = lessons
    .filter((lesson) => lesson.status === "planned" && lesson.date >= today)
    .reverse()
    .slice(0, 3);
  const past = lessons.filter((lesson) => lesson.status === "done");
  const doneCount = past.length;

  return (
    <>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ChevronLeft className="size-4" />
        本周
      </Link>
      <header style={subjectStyle(subject.hue)} className="subj-tint -mx-4 px-4 py-5 sm:mx-0 sm:rounded-lg sm:px-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-ink sm:text-3xl">
          <SubjectSwatch hue={subject.hue} className="size-3.5 rounded" />
          {subject.name}
        </h1>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
          <span>{subject.teacherName || "老师待定"}</span>
          <span>已上 {doneCount} 节</span>
          <span>资料 {sets.length} 册</span>
          {upcoming[0] ? (
            <span className="subj-ink font-medium">
              下节 {formatRelativeDate(upcoming[0].date, today)} {upcoming[0].startTime}
            </span>
          ) : null}
        </p>
      </header>

      <nav aria-label="科目内容" className="mt-4 flex gap-1 border-b border-rule">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={item.key === "notes" ? `/subjects/${slug}` : `/subjects/${slug}?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            scroll={false}
            className={cn(
              "relative px-3 py-3 text-[0.9375rem] transition-colors duration-150",
              tab === item.key ? "font-medium text-brand" : "text-ink-2 hover:text-ink",
            )}
          >
            {item.label}
            {tab === item.key ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" /> : null}
          </Link>
        ))}
      </nav>

      <div className="pt-6">
        {tab === "notes" ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section>
              {past.length === 0 ? (
                <p className="text-ink-3">还没有课程纪要。上完课后，老师的总结会出现在这里。</p>
              ) : (
                <NotesTimeline lessons={past} showSubject={false} excerptLength={140} />
              )}
            </section>
            {upcoming.length > 0 ? (
              <aside className="order-first lg:order-none">
                <h2 className="mb-2.5 text-[0.9375rem] font-medium text-ink-2">接下来</h2>
                <div className="space-y-2">
                  {upcoming.map((lesson) => (
                    <div key={lesson.id}>
                      <p className="mb-1 text-sm text-ink-3">{formatRelativeDate(lesson.date, today)}</p>
                      <LessonBlock lesson={lesson} compact />
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}

        {tab === "materials" ? (
          sets.length === 0 ? (
            <p className="text-ink-3">这个科目还没有资料。工作人员上传后会出现在这里。</p>
          ) : (
            <div className="space-y-10">
              {MATERIAL_CATEGORIES.map((category) => {
                const own = sets.filter((set) => set.category === category);
                if (own.length === 0) return null;
                return (
                  <section key={category}>
                    <h2 className="mb-3 font-semibold text-ink">{materialCategoryLabel(category)}</h2>
                    <MaterialGrid sets={own} />
                  </section>
                );
              })}
            </div>
          )
        ) : null}

        {tab === "plan" ? (
          subject.planMd ? (
            <article className="max-w-[68ch]">
              <Markdown>{subject.planMd}</Markdown>
              {subject.planUpdatedAt ? (
                <p className="mt-6 border-t border-rule pt-3 text-sm text-ink-3">
                  {subject.teacherName || "老师"}更新于 {formatDateTime(subject.planUpdatedAt)}
                </p>
              ) : null}
            </article>
          ) : (
            <p className="text-ink-3">老师还没有写整体规划。</p>
          )
        ) : null}
      </div>
    </>
  );
}
