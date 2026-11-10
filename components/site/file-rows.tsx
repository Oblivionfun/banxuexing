import { Download, FileAudio, FileText } from "lucide-react";
import type { FileRow } from "@/lib/db/schema";
import { fileKindLabel, formatBytes } from "@/lib/labels";

/** 图片以外的文件：录音直接播放，文档可预览或下载。 */
export function FileRows({ files }: { files: FileRow[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {files.map((file) => (
        <li key={file.id} className="py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-paper">
              {file.kind === "audio" ? (
                <FileAudio className="size-5 text-ink-2" aria-hidden />
              ) : (
                <FileText className="size-5 text-ink-2" aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{file.originalName}</span>
              <span className="tabular block text-sm text-ink-3">
                {fileKindLabel(file.kind)}，{formatBytes(file.size)}
              </span>
            </span>
            {file.kind === "pdf" ? (
              <a
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-brand hover:bg-brand-tint sm:inline-flex"
              >
                预览
              </a>
            ) : null}
            <a
              href={`/api/files/${file.id}?dl=1`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rule-strong bg-surface px-3 text-sm font-medium text-ink hover:border-ink-3"
            >
              <Download className="size-4" />
              下载
            </a>
          </div>
          {file.kind === "audio" ? (
            <audio controls preload="none" src={`/api/files/${file.id}`} className="mt-3 w-full">
              你的浏览器无法播放录音，请下载后收听。
            </audio>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
