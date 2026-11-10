"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Uploader, type UploadTarget } from "@/components/admin/uploader";

export function AttachUploader({ target, startLabel }: { target: UploadTarget; startLabel?: string }) {
  const router = useRouter();
  return (
    <Uploader
      compact
      startLabel={startLabel}
      resolveTarget={async () => target}
      onFinished={(summary) => {
        if (summary.failed > 0) toast.error(`${summary.failed} 个文件没有传上去，可以点"重试"`);
        else toast.success(`已上传 ${summary.done} 个文件`);
        router.refresh();
      }}
    />
  );
}
