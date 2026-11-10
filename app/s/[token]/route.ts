import type { NextRequest } from "next/server";
import {
  VIEW_COOKIE,
  VIEW_COOKIE_MAX_AGE,
  cookieSecure,
  safeEqual,
  safeNextPath,
  viewCookieValue,
} from "@/lib/auth-core";
import { getEnv } from "@/lib/env";
import { relativeRedirect } from "@/lib/http";

export async function GET(request: NextRequest, ctx: RouteContext<"/s/[token]">) {
  const { token } = await ctx.params;
  const env = getEnv();

  if (!safeEqual(token, env.SHARE_TOKEN)) {
    return relativeRedirect("/denied?reason=expired");
  }

  const response = relativeRedirect(safeNextPath(request.nextUrl.searchParams.get("next")));
  response.cookies.set(VIEW_COOKIE, viewCookieValue(env), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(env),
    maxAge: VIEW_COOKIE_MAX_AGE,
    path: "/",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
