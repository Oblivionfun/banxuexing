import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const schema = z.object({
  SITE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.url().optional(),
  ),
  SHARE_TOKEN: z.string().min(16, "SHARE_TOKEN 至少 16 位"),
  ADMIN_PASSCODE: z.string().min(6, "ADMIN_PASSCODE 至少 6 位"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET 至少 32 位"),
  // Vercel 函数只有 /tmp 可写，且内容不持久
  DATA_DIR: z.string().default(process.env.VERCEL ? "/tmp/banxuexing" : "./data"),
  AI_BASE_URL: optionalString,
  AI_API_KEY: optionalString,
  AI_MODEL: optionalString,
});

export type Env = z.infer<typeof schema>;

const DEV_DEFAULTS = {
  SHARE_TOKEN: "devShareToken0123456789",
  ADMIN_PASSCODE: "123456",
  SESSION_SECRET: "dev-session-secret-0123456789abcdef0123456789",
} as const;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const isProd = process.env.NODE_ENV === "production";
  const raw = {
    ...process.env,
    SHARE_TOKEN: process.env.SHARE_TOKEN || (isProd ? undefined : DEV_DEFAULTS.SHARE_TOKEN),
    ADMIN_PASSCODE:
      process.env.ADMIN_PASSCODE || (isProd ? undefined : DEV_DEFAULTS.ADMIN_PASSCODE),
    SESSION_SECRET:
      process.env.SESSION_SECRET || (isProd ? undefined : DEV_DEFAULTS.SESSION_SECRET),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`环境变量配置有误：\n${details.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

export function isAiConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.AI_BASE_URL && env.AI_API_KEY && env.AI_MODEL);
}
