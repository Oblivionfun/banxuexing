import type { Metadata } from "next";
import { RotateCcw, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/buttons";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectTag } from "@/components/subject-mark";
import { fileKindLabel, formatBytes, materialCategoryLabel } from "@/lib/labels";
import { listTrash } from "@/lib/queries";
import { formatDateTime, formatDateWithWeekday } from "@/lib/time";
import { purgeAction, restoreAction } from "../../actions";

export const metadata: Metadata = { title: "回收站" };

function RowActions({ kind, id, label }: { kind: "lesson" | "set" | "file"; id: string; label: string }) {
  return (
    <div className="flex shrink-0 gap-2">
      <ActionButton action={restoreAction.bind(null, kind, id)} successMessage="已恢复">
        <RotateCcw />
        恢复
      </ActionButton>
      <ActionButton
        action={purgeAction.bind(null, kind, id)}
        variant="ghost"
        successMessage="已彻底删除"
        aria-label={`彻底删除 ${label}`}
        confirm={{
          title: "彻底删除？",
          description: `「${label}」会被永久删除，文件也会从服务器上移除，无法恢复。`,
          confirmText: "彻底删除",
        }}
      >
        <Trash2 className="text-danger" />
      </ActionButton>
    </div>
  );
}

export default function TrashPage() {
  const trash = listTrash();
  const empty = trash.lessons.length + trash.sets.length + trash.files.length === 0;

  return (
    <>
      <PageHeader title="回收站" description="删除的内容先放在这里，家长和老师看不到。恢复后会回到原来的位置。" />
      {empty ? (
        <p className="text-ink-2">回收站是空的。</p>
      ) : (
        <div className="space-y-10">
          {trash.sets.length > 0 ? (
            <section>
              <h2 className="font-semibold text-ink">资料册</h2>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {trash.sets.map((set) => (
                  <li key={set.id} className="flex flex-wrap items-center gap-3 py-3">
                    <SubjectTag name={set.subject.name} hue={set.subject.hue} />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {materialCategoryLabel(set.category)}：{set.title}
                    </span>
                    <span className="text-sm text-ink-3">
                      删除于 {set.deletedAt ? formatDateTime(set.deletedAt) : ""}
                    </span>
                    <RowActions kind="set" id={String(set.id)} label={set.title} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {trash.lessons.length > 0 ? (
            <section>
              <h2 className="font-semibold text-ink">课程</h2>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {trash.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex flex-wrap items-center gap-3 py-3">
                    <SubjectTag name={lesson.subject.name} hue={lesson.subject.hue} />
                    <span className="tabular min-w-0 flex-1 text-ink">
                      {formatDateWithWeekday(lesson.date)} {lesson.startTime}
                    </span>
                    <RowActions
                      kind="lesson"
                      id={String(lesson.id)}
                      label={`${lesson.subject.name} ${formatDateWithWeekday(lesson.date)}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {trash.files.length > 0 ? (
            <section>
              <h2 className="font-semibold text-ink">单个文件</h2>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {trash.files.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center gap-3 py-3">
                    {file.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/files/${file.id}?v=thumb`}
                        alt=""
                        loading="lazy"
                        className="size-12 rounded-md bg-paper object-cover"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-ink">{file.originalName}</span>
                    <span className="tabular text-sm text-ink-3">
                      {fileKindLabel(file.kind)}，{formatBytes(file.size)}
                    </span>
                    <RowActions kind="file" id={file.id} label={file.originalName} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
