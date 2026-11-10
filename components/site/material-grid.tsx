import Link from "next/link";
import { FileText } from "lucide-react";
import { materialCategoryLabel } from "@/lib/labels";
import type { MaterialSetSummary } from "@/lib/queries";
import { formatMonthDay, dateKeyOf } from "@/lib/time";

/** 资料册封面：真实照片缩略图就是这里的主角。 */
export function MaterialGrid({ sets, showSubject = false }: { sets: MaterialSetSummary[]; showSubject?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {sets.map((set) => (
        <li key={set.id}>
          <Link href={`/materials/${set.id}`} className="group block">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-md border border-rule bg-paper">
              {set.coverFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${set.coverFileId}?v=thumb`}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <FileText className="size-8 text-ink-3" aria-hidden />
                </span>
              )}
              <span className="tabular absolute right-1.5 bottom-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-xs text-white">
                {set.fileCount}
              </span>
            </span>
            <span className="mt-2 line-clamp-2 block font-medium text-ink group-hover:text-brand">{set.title}</span>
            <span className="mt-0.5 block text-sm text-ink-3">
              {showSubject ? `${set.subject.name}${materialCategoryLabel(set.category)}` : materialCategoryLabel(set.category)}
              ，{formatMonthDay(dateKeyOf(set.createdAt))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
