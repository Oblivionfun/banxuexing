import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  MessageSquareText,
  Settings,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "更多" };

const ITEMS = [
  {
    href: "/admin/import",
    label: "导入群消息",
    description: "粘贴老师的消息，识别成课程或纪要草稿",
    icon: MessageSquareText,
  },
  {
    href: "/admin/subjects",
    label: "科目与老师",
    description: "老师称呼、科目说明和老师介绍",
    icon: GraduationCap,
  },
  {
    href: "/admin/scheduling",
    label: "排课助手",
    description: "看空档时间，安排下一节课",
    icon: CalendarClock,
  },
  {
    href: "/admin/trash",
    label: "回收站",
    description: "找回误删的课程、资料和文件",
    icon: Trash2,
  },
  {
    href: "/admin/settings",
    label: "设置",
    description: "学生称呼、年级和查看链接",
    icon: Settings,
  },
] as const;

export default function MorePage() {
  return (
    <>
      <PageHeader title="更多" description="管理端的其他入口。" />

      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
        {ITEMS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 hover:bg-brand-tint/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{label}</span>
                <span className="mt-0.5 block text-sm text-ink-3">{description}</span>
              </span>
              <ChevronRight className="size-4 text-ink-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        看看家长端的效果
        <ExternalLink className="size-4" aria-hidden />
      </Link>
    </>
  );
}
