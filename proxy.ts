import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, VIEW_COOKIE, isAdminCookie, isViewCookie } from "@/lib/auth-core";
import { getEnv } from "@/lib/env";

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const env = getEnv();
  const admin = isAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value, env);

  if (pathname === "/admin/login") {
    return admin ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (admin) return NextResponse.next();
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/api/admin") || pathname === "/api/upload") {
    return admin ? NextResponse.next() : unauthorized("需要管理口令");
  }

  const viewer = admin || isViewCookie(request.cookies.get(VIEW_COOKIE)?.value, env);
  if (viewer) return NextResponse.next();

  if (pathname.startsWith("/api/")) return unauthorized("请通过工作人员发送的链接打开");
  return NextResponse.redirect(new URL("/denied", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|s/|denied|api/health).*)",
  ],
};
