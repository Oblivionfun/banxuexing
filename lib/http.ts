import { NextResponse } from "next/server";

/**
 * 路由处理函数里用相对路径跳转。不要用 request.url 拼绝对地址：standalone 模式下它的主机名是
 * 服务进程的监听地址（如 localhost:3000），不是用户访问的域名，跳过去后 Cookie 会对不上。
 * （proxy 里不能用它：proxy 要求绝对地址，Next 会自动把同源地址转成相对路径。）
 */
export function relativeRedirect(location: string, status: 302 | 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: location } });
}
