import { cn } from "cn";
import type { ReactNode } from "react";
import { splitItems } from "@/lib/labels";

/** 老师批改用的红笔下划线：略带起伏的手写笔画，加载时画出一次。 */
export function RedPenUnderline({ className, seed = 0 }: { className?: string; seed?: number }) {
  const wobble = [
    "M3 9 C 38 4, 74 12, 112 7 S 172 5, 197 8",
    "M2 8 C 44 11, 86 3, 124 8 S 178 10, 198 6",
    "M4 7 C 36 10, 82 5, 118 9 S 170 4, 196 8",
  ][seed % 3];
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("pointer-events-none block h-[0.55em] w-full text-mark", className)}
    >
      <path
        d={wobble}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="redpen-stroke"
        pathLength={1}
      />
    </svg>
  );
}

export function RedPenHeading({
  children,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag className={cn("inline-block text-lg font-semibold text-mark", className)}>
      <span className="relative inline-block">
        {children}
        <RedPenUnderline className="absolute -bottom-[0.45em] left-[-4%] w-[108%]" />
      </span>
    </Tag>
  );
}

/** 作业与下节准备：作业本横线上的条目，标签用红笔。 */
export function AssignmentList({
  homework,
  prep,
  className,
}: {
  homework: string;
  prep: string;
  className?: string;
}) {
  const groups = [
    { label: "作业", items: splitItems(homework) },
    { label: "下节准备", items: splitItems(prep) },
  ].filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <dl className={cn("notebook text-[0.9375rem] leading-8", className)}>
      {groups.map((group) => (
        <div key={group.label} className="grid grid-cols-[4.5rem_1fr] gap-x-2">
          <dt className="font-medium text-mark">{group.label}</dt>
          <dd className="min-w-0">
            <ol>
              {group.items.map((item, index) => (
                <li key={index} className="break-words text-ink">
                  {group.items.length > 1 ? (
                    <span className="tabular mr-1.5 text-ink-3">{index + 1}.</span>
                  ) : null}
                  {item}
                </li>
              ))}
            </ol>
          </dd>
        </div>
      ))}
    </dl>
  );
}
