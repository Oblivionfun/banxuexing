"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/upload", label: "上传", icon: Upload },
  { href: "/admin/lessons", label: "课程", icon: CalendarRange },
  { href: "/admin/materials", label: "资料", icon: FolderOpen },
  { href: "/admin/more", label: "更多", icon: MoreHorizontal },
] as const;

const PRIMARY = ["/admin/upload", "/admin/lessons", "/admin/materials"] as const;

/** 录入/编辑课程时页面底部有保存条，再叠一层导航会挡住操作，这两个页面不显示。 */
const HIDDEN_PATHS = /^\/admin\/lessons\/.+/;

function isCurrent(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/more") return !PRIMARY.some((path) => pathname.startsWith(path));
  return pathname.startsWith(href);
}

export function AdminBottomNav() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.test(pathname)) return null;

  return (
    <nav
      aria-label="管理快捷导航"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-7xl">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(href, pathname);
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
