import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, VIEW_COOKIE, isAdminCookie, isViewCookie } from "@/lib/auth-core";
import { getEnv } from "@/lib/env";

export class AuthError extends Error {
  constructor(message = "需要管理口令") {
    super(message);
    this.name = "AuthError";
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isAdminCookie(store.get(ADMIN_COOKIE)?.value, getEnv());
}

export async function isViewer(): Promise<boolean> {
  const store = await cookies();
  const env = getEnv();
  return (
    isAdminCookie(store.get(ADMIN_COOKIE)?.value, env) ||
    isViewCookie(store.get(VIEW_COOKIE)?.value, env)
  );
}

/** Server Action 内的二次校验：proxy 之外再防一层。 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new AuthError();
}

export async function requireViewer(): Promise<void> {
  if (!(await isViewer())) throw new AuthError("请通过工作人员发送的链接打开");
}

export function shareUrl(nextPath?: string): string {
  const env = getEnv();
  const base = env.SITE_URL ?? "http://localhost:3000";
  const url = new URL(`/s/${env.SHARE_TOKEN}`, base);
  if (nextPath && nextPath !== "/") url.searchParams.set("next", nextPath);
  return url.toString();
}
