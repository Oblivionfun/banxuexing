import Link from "next/link";
import { BrandBar } from "@/components/site/brand-bar";

export default function NotFound() {
  return (
    <>
      <BrandBar />
      <main className="mx-auto max-w-xl px-5 pt-14 pb-20">
        <h1 className="text-2xl font-semibold text-ink">找不到这个页面</h1>
        <p className="mt-3 text-ink-2">内容可能已经被工作人员删除或移动了。</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand underline">
          回到本周
        </Link>
      </main>
    </>
  );
}
