type Bucket = { failures: number; firstAt: number; lockedUntil: number };

export type RateLimiter = {
  check(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
  fail(key: string, now?: number): void;
  reset(key: string): void;
};

/** 单实例内存限流：窗口内失败次数达到上限后锁定一段时间。 */
export function createRateLimiter({
  maxFailures,
  windowMs,
  lockMs,
}: {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    check(key, now = Date.now()) {
      const bucket = buckets.get(key);
      if (!bucket) return { allowed: true, retryAfterSec: 0 };
      if (bucket.lockedUntil > now) {
        return { allowed: false, retryAfterSec: Math.ceil((bucket.lockedUntil - now) / 1000) };
      }
      if (now - bucket.firstAt > windowMs) buckets.delete(key);
      return { allowed: true, retryAfterSec: 0 };
    },
    fail(key, now = Date.now()) {
      const bucket = buckets.get(key);
      if (!bucket || now - bucket.firstAt > windowMs) {
        buckets.set(key, { failures: 1, firstAt: now, lockedUntil: 0 });
        return;
      }
      bucket.failures += 1;
      if (bucket.failures >= maxFailures) bucket.lockedUntil = now + lockMs;
    },
    reset(key) {
      buckets.delete(key);
    },
  };
}

const globalForLimiter = globalThis as unknown as { __bxxLoginLimiter?: RateLimiter };

export function loginLimiter(): RateLimiter {
  globalForLimiter.__bxxLoginLimiter ??= createRateLimiter({
    maxFailures: 5,
    windowMs: 10 * 60_000,
    lockMs: 10 * 60_000,
  });
  return globalForLimiter.__bxxLoginLimiter;
}
