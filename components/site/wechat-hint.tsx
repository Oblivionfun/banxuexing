"use client";

import { useSyncExternalStore } from "react";
import { Info } from "lucide-react";

type Env = "android-wechat" | "ios-wechat" | "other";

function detect(): Env {
  const ua = navigator.userAgent;
  if (!/MicroMessenger/i.test(ua)) return "other";
  return /Android/i.test(ua) ? "android-wechat" : "ios-wechat";
}

const subscribe = () => () => undefined;

/** 微信内置浏览器下载文件经常失败，提前告诉家长和老师怎么办。 */
export function WeChatDownloadHint() {
  const env = useSyncExternalStore<Env>(subscribe, detect, () => "other");
  if (env === "other") return null;
  return (
    <p className="flex gap-2 rounded-md bg-warning-tint px-3.5 py-3 text-[0.9375rem] text-warning">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {env === "android-wechat"
          ? "在微信里下载文件可能失败。请点右上角「···」，选择「在浏览器打开」后再下载。图片可以点开后长按保存。"
          : "图片可以点开后长按保存。PDF、Word 等文件点开后，用右上角「···」可以转发或用其他应用打开。"}
      </span>
    </p>
  );
}
