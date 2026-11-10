import { ArrowDown, ArrowUp, FileAudio, FileText, Trash2 } from "lucide-react";
import { deleteFileAction, moveFileAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/buttons";
import type { FileRow } from "@/lib/db/schema";
import { fileKindLabel, formatBytes } from "@/lib/labels";

export function AdminFileList({ files }: { files: FileRow[] }) {
  if (files.length === 0) {
    return <p className="text-ink-3">还没有文件。</p>;
  }
  return (
    <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
      {files.map((file, index) => (
        <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
          <a
            href={`/api/files/${file.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper"
          >
            {file.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${file.id}?v=thumb`} alt="" loading="lazy" className="size-full object-cover" />
            ) : file.kind === "audio" ? (
              <FileAudio className="size-5 text-ink-3" aria-hidden />
            ) : (
              <FileText className="size-5 text-ink-3" aria-hidden />
            )}
          </a>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] text-ink">{file.originalName}</p>
            <p className="tabular text-sm text-ink-3">
              {fileKindLabel(file.kind)}，{formatBytes(file.size)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ActionButton
              action={moveFileAction.bind(null, file.id, "up")}
              variant="ghost"
              size="icon-sm"
              aria-label="往前移"
              className={index === 0 ? "invisible" : undefined}
            >
              <ArrowUp />
            </ActionButton>
            <ActionButton
              action={moveFileAction.bind(null, file.id, "down")}
              variant="ghost"
              size="icon-sm"
              aria-label="往后移"
              className={index === files.length - 1 ? "invisible" : undefined}
            >
              <ArrowDown />
            </ActionButton>
            <ActionButton
              action={deleteFileAction.bind(null, file.id)}
              variant="ghost"
              size="icon-sm"
              aria-label={`删除 ${file.originalName}`}
              successMessage="已删除，可在回收站恢复"
            >
              <Trash2 className="text-danger" />
            </ActionButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
