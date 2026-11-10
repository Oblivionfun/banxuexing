import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 开发模式下 React 需要 eval 重建调用栈；生产环境不放开
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // 自托管用 standalone（Docker）；Vercel 有自己的构建输出
  output: process.env.VERCEL ? undefined : "standalone",
  // file-type 运行时会动态 import("strtok3")，打进 bundle 后依赖追踪不到；作为外部包才会被完整带上
  serverExternalPackages: ["better-sqlite3", "sharp", "file-type"],
  // 运行时数据目录不能被打进构建产物
  outputFileTracingExcludes: { "*": ["./data/**", "./e2e/**", "./tests/**", "./scripts/**"] },
  // strtok3 的 Node 入口（lib/index.js 等）只通过 file-type 的动态 import 加载，追踪不到，需手动带上
  outputFileTracingIncludes: { "*": ["./drizzle/**", "./demo/**", "./node_modules/strtok3/**"] },
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
