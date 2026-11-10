"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminCookieValue,
  cookieSecure,
  safeEqual,
  safeNextPath,
} from "@/lib/auth-core";
import { getEnv } from "@/lib/env";
import { loginLimiter } from "@/lib/rate-limit";

export type LoginState = { error?: string };

async function clientKey(): Promise<string> {
  const store = await headers();
  return (
    store.get("x-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || "local"
  );
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const env = getEnv();
  const key = await clientKey();
  const limiter = loginLimiter();
  const status = limiter.check(key);
  if (!status.allowed) {
    const minutes = Math.ceil(status.retryAfterSec / 60);
    return { error: `口令错误次数过多，请 ${minutes} 分钟后再试。` };
  }

  const passcode = String(formData.get("passcode") ?? "");
  if (!safeEqual(passcode, env.ADMIN_PASSCODE)) {
    limiter.fail(key);
    return { error: "口令不对，请检查后重新输入。" };
  }

  limiter.reset(key);
  const store = await cookies();
  store.set(ADMIN_COOKIE, adminCookieValue(env), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(env),
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect(safeNextPath(String(formData.get("next") ?? ""), "/admin"));
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
