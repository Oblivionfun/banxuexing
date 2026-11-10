import type { Metadata } from "next";
import { BrandBar } from "@/components/site/brand-bar";

export const metadata: Metadata = { title: "请使用专属链接打开" };

export default async function DeniedPage({ searchParams }: PageProps<"/denied">) {
  const { reason } = await searchParams;
  const expired = reason === "expired";

  return (
    <>
      <BrandBar home="/denied" />
      <main className="mx-auto max-w-xl px-5 pt-14 pb-20 sm:pt-20">
        <h1 className="text-2xl font-semibold text-ink">
          {expired ? "这个链接已经失效" : "请用工作人员发给您的链接打开"}
        </h1>
        <p className="mt-4 text-ink-2">
          {expired
            ? "链接可能已经更换。请在微信群里向工作人员要一个新的链接，点开后就能继续查看。"
            : "学习档案只对家长和任课老师开放。请回到微信群，点开工作人员发的专属链接；点开一次后，这台手机之后可以直接访问。"}
        </p>
        <p className="mt-8 border-t border-rule pt-5 text-sm text-ink-3">
          工作人员请前往{" "}
          <a href="/admin/login" className="text-brand underline">
            管理入口
          </a>
          。
        </p>
      </main>
    </>
  );
}
