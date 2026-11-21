import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { SubjectCover } from "@/components/subject-cover";
import type { SubjectWithStats } from "@/lib/queries";
import { formatMonthDay } from "@/lib/time";

/** 科目列表：首页和「科目」总览共用。 */
export function SubjectList({
  subjects,
  className,
}: {
  subjects: SubjectWithStats[];
  className?: string;
}) {
  return (
    <ul className={cn("grid border-t border-rule sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3", className)}>
      {subjects.map((subject) => (
        <li key={subject.id} className="border-b border-rule">
          <Link href={`/subjects/${subject.slug}`} className="group flex items-center gap-3.5 py-3">
            <SubjectCover
              slug={subject.slug}
              size="sm"
              className="w-11 shrink-0 rounded-[4px] border border-rule"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="font-semibold text-ink">{subject.name}</span>
                <span className="truncate text-sm text-ink-2">{subject.teacherName || "老师待定"}</span>
              </span>
              <span className="mt-0.5 block text-sm text-ink-3">
                {subject.materialCount > 0 ? `资料 ${subject.materialCount} 册` : "暂无资料"}
                {subject.nextLessonDate ? `，下节 ${formatMonthDay(subject.nextLessonDate)}` : ""}
              </span>
            </span>
            <ChevronRight className="size-4 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
