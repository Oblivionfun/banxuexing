import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, VIEW_COOKIE, isAdminCookie, isViewCookie } from "@/lib/auth-core";
import { getEnv } from "@/lib/env";

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

function redirectTo(request: NextRequest, pathname: string, params?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const env = getEnv();
  const admin = isAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value, env);

  if (pathname === "/admin/login") {
    return admin ? redirectTo(request, "/admin") : NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (admin) return NextResponse.next();
    return redirectTo(request, "/admin/login", { next: pathname + search });
  }

  if (pathname.startsWith("/api/admin")) {
    return admin ? NextResponse.next() : unauthorized("需要管理口令");
  }

  const viewer = admin || isViewCookie(request.cookies.get(VIEW_COOKIE)?.value, env);
  if (viewer) return NextResponse.next();

  if (pathname.startsWith("/api/")) return unauthorized("请通过工作人员发送的链接打开");
  return redirectTo(request, "/denied");
}

// /api/upload 不经过 proxy：经过 proxy 的请求体会被缓冲并在 10MB 处截断，上传接口自行校验口令。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon|robots.txt|s/|denied|api/health|api/upload).*)",
  ],
};
