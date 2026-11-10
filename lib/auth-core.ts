import { createHmac, timingSafeEqual } from "node:crypto";
import type { Env } from "@/lib/env";

export const VIEW_COOKIE = "bxx_view";
export const ADMIN_COOKIE = "bxx_admin";

export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** 签名里带上当前的分享串和口令：两者任一更换，旧 Cookie 立即失效。 */
export function viewCookieValue(env: Env): string {
  return sign(env.SESSION_SECRET, `view:${env.SHARE_TOKEN}`);
}

export function adminCookieValue(env: Env): string {
  return sign(env.SESSION_SECRET, `admin:${env.ADMIN_PASSCODE}`);
}

export function isAdminCookie(value: string | undefined, env: Env): boolean {
  return Boolean(value) && safeEqual(value as string, adminCookieValue(env));
}

export function isViewCookie(value: string | undefined, env: Env): boolean {
  return Boolean(value) && safeEqual(value as string, viewCookieValue(env));
}

export function cookieSecure(env: Env): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  return !env.SITE_URL?.startsWith("http://");
}

/** 只允许站内相对路径作为跳转目标，防止开放重定向。 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
