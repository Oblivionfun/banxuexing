import type { Metadata } from "next";
import Link from "next/link";
import { SubjectSwatch } from "@/components/subject-mark";
import { MaterialGrid } from "@/components/site/material-grid";
import { listMaterialSets, listSubjects } from "@/lib/queries";

export const metadata: Metadata = { title: "资料" };

export default function MaterialsPage() {
  const subjects = listSubjects();
  const sets = listMaterialSets();
  const withSets = subjects.filter((subject) => sets.some((set) => set.subjectId === subject.id));

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">资料</h1>
        <p className="mt-1.5 text-ink-2">
          {sets.length === 0
            ? "工作人员上传后，课本、试卷等资料会按科目出现在这里。"
            : `共 ${sets.length} 册资料。点开可以看大图、下载原图或整册打包下载。`}
        </p>
      </header>

      {withSets.length > 1 ? (
        <nav aria-label="按科目跳转" className="mb-8 flex flex-wrap gap-2">
          {withSets.map((subject) => (
            <a
              key={subject.id}
              href={`#subject-${subject.slug}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rule-strong bg-surface px-3.5 text-[0.9375rem] text-ink hover:border-ink-3"
            >
              <SubjectSwatch hue={subject.hue} />
              {subject.name}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="space-y-12">
        {withSets.map((subject) => (
          <section key={subject.id} id={`subject-${subject.slug}`} className="scroll-mt-20">
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <SubjectSwatch hue={subject.hue} className="size-3" />
                {subject.name}
              </h2>
              <Link
                href={`/subjects/${subject.slug}?tab=materials`}
                className="ml-auto text-sm font-medium text-brand hover:underline"
              >
                按类别看
              </Link>
            </div>
            <MaterialGrid sets={sets.filter((set) => set.subjectId === subject.id)} />
          </section>
        ))}
      </div>
    </>
  );
}
