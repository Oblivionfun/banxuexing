import type { Metadata } from "next";
import { BrandBar } from "@/components/site/brand-bar";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "管理入口" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next } = await searchParams;

  return (
    <>
      <BrandBar home="/admin/login" />
      <main className="mx-auto max-w-sm px-5 pt-14 pb-20 sm:pt-20">
        <h1 className="text-2xl font-semibold text-ink">工作人员管理入口</h1>
        <p className="mt-3 text-ink-2">输入管理口令后，可以上传资料、录入课程纪要和排课。</p>
        <LoginForm next={typeof next === "string" ? next : "/admin"} />
      </main>
    </>
  );
}
