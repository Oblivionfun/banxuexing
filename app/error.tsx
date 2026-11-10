"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-5 pt-14 pb-20">
      <h1 className="text-2xl font-semibold text-ink">页面没有加载出来</h1>
      <p className="mt-3 text-ink-2">
        可能是网络不稳定。请点下面的按钮重试；如果一直这样，请告诉工作人员
        {error.digest ? `（错误编号 ${error.digest}）` : ""}。
      </p>
      <Button className="mt-6" onClick={reset}>
        重新加载
      </Button>
    </main>
  );
}
