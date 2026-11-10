import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { BrandBar } from "@/components/site/brand-bar";
import { logoutAction } from "../auth-actions";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <BrandBar home="/admin">
        <span className="rounded bg-white/15 px-1.5 py-0.5 text-xs font-medium tracking-[0.04em]">
          管理
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-white/90 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">家长看到的页面</span>
            <span className="sm:hidden">家长端</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-white/90 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </form>
        </div>
      </BrandBar>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
