"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ITEMS = [
  { href: "/", label: "本周", match: (path: string) => path === "/" },
  { href: "/schedule", label: "课表", match: (path: string) => path.startsWith("/schedule") },
  {
    href: "/materials",
    label: "资料",
    match: (path: string) => path.startsWith("/materials"),
  },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="ml-auto flex items-center gap-0.5">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-3 text-[0.9375rem] transition-colors duration-150",
              active ? "bg-white/15 font-medium text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
