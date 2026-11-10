import { NextResponse, type NextRequest } from "next/server";
import {
  VIEW_COOKIE,
  VIEW_COOKIE_MAX_AGE,
  cookieSecure,
  safeEqual,
  safeNextPath,
  viewCookieValue,
} from "@/lib/auth-core";
import { getEnv } from "@/lib/env";

export async function GET(request: NextRequest, ctx: RouteContext<"/s/[token]">) {
  const { token } = await ctx.params;
  const env = getEnv();

  if (!safeEqual(token, env.SHARE_TOKEN)) {
    return NextResponse.redirect(new URL("/denied?reason=expired", request.url));
  }

  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(VIEW_COOKIE, viewCookieValue(env), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(env),
    maxAge: VIEW_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
