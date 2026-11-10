"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, ImagePlus, Loader2, RotateCw, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from "@/lib/file-types";
import { formatBytes } from "@/lib/labels";

export type UploadTarget = { setId: number } | { lessonId: number };

type Status = "queued" | "uploading" | "done" | "duplicate" | "error";

type Item = {
  key: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  previewUrl?: string;
};

export type UploadSummary = { done: number; duplicate: number; failed: number };

const CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;

class RetryableError extends Error {}

function uploadOnce(
  file: File,
  target: UploadTarget,
  onProgress: (fraction: number) => void,
): Promise<{ duplicate: boolean }> {
  return new Promise((resolve, reject) => {
    const params = "setId" in target ? `setId=${target.setId}` : `lessonId=${target.lessonId}`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/upload?${params}`);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader("x-file-size", String(file.size));
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body: { error?: string; duplicate?: boolean } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* 非 JSON 响应按状态码处理 */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ duplicate: Boolean(body.duplicate) });
        return;
      }
      const message = body.error ?? `上传失败（${xhr.status}）`;
      if (xhr.status === 401) {
        reject(new Error("登录已过期，请刷新页面重新输入口令"));
      } else if (xhr.status >= 500 || xhr.status === 408 || xhr.status === 429) {
        reject(new RetryableError(message));
      } else {
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new RetryableError("网络中断"));
    xhr.ontimeout = () => reject(new RetryableError("上传超时"));
    xhr.send(file);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Uploader({
  resolveTarget,
  onFinished,
  startLabel = "开始上传",
  disabledReason,
  compact = false,
}: {
  resolveTarget: () => Promise<UploadTarget | null>;
  onFinished?: (summary: UploadSummary) => void;
  startLabel?: string;
  disabledReason?: string;
  compact?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    return () => itemsRef.current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
  }, []);

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const patch = useCallback((key: string, update: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...update } : item)));
  }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: Item[] = Array.from(list).map((file) => {
      const tooLarge = file.size > MAX_UPLOAD_BYTES;
      return {
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: tooLarge ? "error" : "queued",
        progress: 0,
        error: tooLarge ? `超过 ${MAX_UPLOAD_BYTES / 1024 / 1024} MB 上限` : undefined,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };
    });
    setItems((current) => [...current, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (key: string) => {
    setItems((current) => {
      const found = current.find((item) => item.key === key);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  };

  const uploadItem = async (item: Item, target: UploadTarget) => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      patch(item.key, { status: "uploading", progress: 0, error: undefined });
      try {
        const result = await uploadOnce(item.file, target, (fraction) =>
          patch(item.key, { progress: fraction }),
        );
        patch(item.key, { status: result.duplicate ? "duplicate" : "done", progress: 1 });
        return result.duplicate ? "duplicate" : "done";
      } catch (error) {
        const message = error instanceof Error ? error.message : "上传失败";
        if (error instanceof RetryableError && attempt < MAX_ATTEMPTS) {
          patch(item.key, { error: `${message}，${attempt * 2} 秒后自动重试…` });
          await sleep(attempt * 2000);
          continue;
        }
        patch(item.key, { status: "error", error: message });
        return "error";
      }
    }
    return "error";
  };

  const start = async (onlyFailed = false) => {
    const pending = itemsRef.current.filter((item) =>
      onlyFailed
        ? item.status === "error" && item.file.size <= MAX_UPLOAD_BYTES
        : item.status === "queued",
    );
    if (pending.length === 0) return;
    setRunning(true);
    try {
      const target = await resolveTarget();
      if (!target) return;
      const summary: UploadSummary = { done: 0, duplicate: 0, failed: 0 };
      const queue = [...pending];
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const outcome = await uploadItem(next, target);
          if (outcome === "done") summary.done += 1;
          else if (outcome === "duplicate") summary.duplicate += 1;
          else summary.failed += 1;
        }
      });
      await Promise.all(workers);
      onFinished?.(summary);
    } finally {
      setRunning(false);
    }
  };

  const queued = items.filter((item) => item.status === "queued").length;
  const failed = items.filter((item) => item.status === "error").length;
  const finished = items.filter((item) => item.status === "done" || item.status === "duplicate").length;

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        id="uploader-input"
        onChange={(event) => addFiles(event.target.files)}
        disabled={running}
      />
      <label
        htmlFor="uploader-input"
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rule-strong bg-surface px-4 text-center transition-colors duration-150 hover:border-brand hover:bg-brand-tint/40",
          compact ? "py-6" : "py-10",
          running && "pointer-events-none opacity-60",
        )}
      >
        <ImagePlus className="size-7 text-brand" aria-hidden />
        <span className="font-medium text-ink">选择照片或文件</span>
        <span className="text-sm text-ink-3">可一次多选；手机上可以直接拍照。单个文件不超过 100&nbsp;MB</span>
      </label>

      {items.length > 0 ? (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <FileText className="size-5 text-ink-3" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] text-ink">{item.file.name}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="tabular text-ink-3">{formatBytes(item.file.size)}</span>
                  <StatusText item={item} />
                </div>
                {item.status === "uploading" ? (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
                      style={{ width: `${Math.round(item.progress * 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
              {item.status === "queued" || (item.status === "error" && !running) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(item.key)}
                  aria-label={`移除 ${item.file.name}`}
                >
                  <X />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          {queued > 0 ? (
            <Button type="button" onClick={() => start(false)} disabled={running || Boolean(disabledReason)}>
              {running ? <Loader2 className="animate-spin" /> : null}
              {running ? "正在上传…" : `${startLabel}（${queued} 个）`}
            </Button>
          ) : null}
          {failed > 0 && !running ? (
            <Button type="button" variant="outline" onClick={() => start(true)}>
              <RotateCw />
              重试失败的 {failed} 个
            </Button>
          ) : null}
          {disabledReason && queued > 0 ? <p className="text-sm text-warning">{disabledReason}</p> : null}
          {running ? <p className="text-sm text-ink-3">上传完成前请不要关闭页面</p> : null}
          {!running && finished > 0 && queued === 0 && failed === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" />
              全部 {finished} 个已上传
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusText({ item }: { item: Item }) {
  switch (item.status) {
    case "queued":
      return <span className="text-ink-3">等待上传</span>;
    case "uploading":
      return (
        <span className="text-brand">
          {item.error ?? `${Math.round(item.progress * 100)}%`}
        </span>
      );
    case "done":
      return <span className="text-success">已上传</span>;
    case "duplicate":
      return <span className="text-ink-3">已存在，跳过</span>;
    case "error":
      return (
        <span className="flex items-center gap-1 text-danger">
          <AlertCircle className="size-3.5" aria-hidden />
          {item.error}
        </span>
      );
    default: {
      const unreachable: never = item.status;
      return unreachable;
    }
  }
}
