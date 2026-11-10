import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PackageOpen } from "lucide-react";
import { SubjectCover } from "@/components/subject-cover";
import { SubjectTag } from "@/components/subject-mark";
import { FileRows } from "@/components/site/file-rows";
import { Gallery } from "@/components/site/gallery";
import { WeChatDownloadHint } from "@/components/site/wechat-hint";
import { formatBytes, materialCategoryLabel } from "@/lib/labels";
import { getMaterialSet } from "@/lib/queries";
import { dateKeyOf, formatMonthDay } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/materials/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getMaterialSet(Number(id))?.set.title ?? "资料" };
}

export default async function MaterialSetPage({ params }: PageProps<"/materials/[id]">) {
  const { id } = await params;
  const found = getMaterialSet(Number(id));
  if (!found) notFound();
  const { set, subject, files } = found;
  const images = files
    .filter((file) => file.kind === "image")
    .map(({ id: fileId, originalName, width, height }) => ({ id: fileId, name: originalName, width, height }));
  const others = files.filter((file) => file.kind !== "image");
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <>
      <Link
        href={`/subjects/${subject.slug}?tab=materials`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        {subject.name}资料
      </Link>

      <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {images.length === 0 ? (
          <SubjectCover slug={subject.slug} className="w-24 shrink-0 rounded-md border border-rule sm:w-28" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <SubjectTag name={subject.name} hue={subject.hue} />
            <span className="text-sm text-ink-3">{materialCategoryLabel(set.category)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">{set.title}</h1>
          <p className="tabular mt-2 text-ink-2">
            {files.length} 个文件，共 {formatBytes(totalSize)}，上传于 {formatMonthDay(dateKeyOf(set.createdAt))}
          </p>
        </div>
        {files.length > 1 ? (
          <a
            href={`/api/materials/${set.id}/zip`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-hover"
          >
            <PackageOpen className="size-4" />
            打包下载全部
          </a>
        ) : null}
      </header>

      {set.note ? (
        <p className="mt-5 max-w-[68ch] border-l border-rule-strong pl-3 whitespace-pre-line text-ink-2">{set.note}</p>
      ) : null}

      <div className="mt-6 space-y-6">
        <WeChatDownloadHint />
        {files.length === 0 ? <p className="text-ink-3">这个资料册里还没有文件。</p> : null}
        {images.length > 0 ? <Gallery images={images} /> : null}
        <FileRows files={others} />
      </div>
    </>
  );
}
