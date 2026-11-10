import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectSwatch } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { materialCategoryLabel } from "@/lib/labels";
import { listMaterialSets, listSubjects } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "资料册" };

export default function MaterialsAdminPage() {
  const subjects = listSubjects();
  const sets = listMaterialSets();

  return (
    <>
      <PageHeader
        title="资料册"
        description="每次上传会建一个资料册。点进去可以改标题、调整顺序或删除。"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/upload">
              <Upload />
              上传资料
            </Link>
          </Button>
        }
      />
      {sets.length === 0 ? (
        <p className="text-ink-2">
          还没有资料。
          <Link href="/admin/upload" className="ml-1 text-brand underline">
            上传第一份
          </Link>
        </p>
      ) : (
        <div className="space-y-8">
          {subjects.map((subject) => {
            const own = sets.filter((set) => set.subjectId === subject.id);
            if (own.length === 0) return null;
            return (
              <section key={subject.id}>
                <h2 className="flex items-center gap-2 font-semibold text-ink">
                  <SubjectSwatch hue={subject.hue} />
                  {subject.name}
                  <span className="text-sm font-normal text-ink-3">{own.length} 册</span>
                </h2>
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {own.map((set) => (
                    <li key={set.id}>
                      <Link
                        href={`/admin/materials/${set.id}`}
                        className="flex items-center gap-3 py-2.5 hover:bg-surface"
                      >
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper">
                          {set.coverFileId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/files/${set.coverFileId}?v=thumb`}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover"
                            />
                          ) : (
                            <FileText className="size-5 text-ink-3" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{set.title}</span>
                          <span className="tabular block text-sm text-ink-3">
                            {materialCategoryLabel(set.category)}，{set.fileCount} 个文件，
                            {formatDateTime(set.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
