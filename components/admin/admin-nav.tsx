"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [
  { href: "/admin", label: "概览", exact: true },
  { href: "/admin/upload", label: "上传资料" },
  { href: "/admin/lessons", label: "课程与纪要" },
  { href: "/admin/materials", label: "资料册" },
  { href: "/admin/subjects", label: "科目与老师" },
  { href: "/admin/scheduling", label: "排课助手" },
  { href: "/admin/settings", label: "设置" },
  { href: "/admin/trash", label: "回收站" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="管理导航" className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4 [scrollbar-width:none]">
        {ITEMS.map((item) => {
          const active =
            "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-3.5 text-[0.9375rem] whitespace-nowrap transition-colors duration-150",
                active ? "font-medium text-brand" : "text-ink-2 hover:text-ink",
              )}
            >
              {item.label}
              {active ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
