"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FolderOpen, House } from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  {
    href: "/",
    label: "本周",
    icon: House,
    active: (path: string) => path === "/" || path.startsWith("/lessons"),
  },
  {
    href: "/schedule",
    label: "课表",
    icon: CalendarDays,
    active: (path: string) => path.startsWith("/schedule") || path.startsWith("/availability"),
  },
  {
    href: "/materials",
    label: "资料",
    icon: FolderOpen,
    active: (path: string) => path.startsWith("/materials"),
  },
  {
    href: "/subjects",
    label: "科目",
    icon: BookOpen,
    active: (path: string) => path.startsWith("/subjects"),
  },
] as const;

export function SiteBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-7xl">
        {ITEMS.map(({ href, label, icon: Icon, active }) => {
          const current = active(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-150 active:bg-brand-tint/60",
                  current ? "font-medium text-brand" : "text-ink-3 hover:text-ink",
                )}
              >
                {current ? (
                  <span className="absolute inset-x-0 top-0 mx-auto h-0.5 w-6 rounded-full bg-brand" />
                ) : null}
                <Icon className="size-[1.375rem]" strokeWidth={1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
