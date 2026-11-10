import { describe, expect, it } from "vitest";
import {
  adminCookieValue,
  isAdminCookie,
  isViewCookie,
  safeNextPath,
  viewCookieValue,
} from "@/lib/auth-core";
import type { Env } from "@/lib/env";
import { contentDisposition, resolveFileType, sanitizeFileName } from "@/lib/file-types";
import { createRateLimiter } from "@/lib/rate-limit";

const env: Env = {
  SHARE_TOKEN: "share-token-1234567890",
  ADMIN_PASSCODE: "passcode",
  SESSION_SECRET: "x".repeat(40),
  DATA_DIR: "./data",
};

describe("auth cookies", () => {
  it("accepts only cookies signed for the current token and passcode", () => {
    expect(isViewCookie(viewCookieValue(env), env)).toBe(true);
    expect(isAdminCookie(adminCookieValue(env), env)).toBe(true);
    expect(isAdminCookie(viewCookieValue(env), env)).toBe(false);
    expect(isViewCookie(undefined, env)).toBe(false);
    const rotated = { ...env, SHARE_TOKEN: "another-token-0987654321" };
    expect(isViewCookie(viewCookieValue(env), rotated)).toBe(false);
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("/lessons/3")).toBe("/lessons/3");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(null, "/admin")).toBe("/admin");
  });
});

describe("rate limiter", () => {
  it("locks after repeated failures and unlocks after the lock period", () => {
    const limiter = createRateLimiter({ maxFailures: 3, windowMs: 60_000, lockMs: 120_000 });
    const t0 = 1_000_000;
    limiter.fail("ip", t0);
    limiter.fail("ip", t0 + 1);
    expect(limiter.check("ip", t0 + 2).allowed).toBe(true);
    limiter.fail("ip", t0 + 3);
    expect(limiter.check("ip", t0 + 4)).toMatchObject({ allowed: false, retryAfterSec: 120 });
    expect(limiter.check("ip", t0 + 3 + 120_001).allowed).toBe(true);
  });
});

describe("file types", () => {
  it("trusts sniffed content over the file name", () => {
    expect(resolveFileType({ mime: "image/jpeg" }, "page.png")).toEqual({ mime: "image/jpeg", kind: "image" });
    expect(resolveFileType({ mime: "application/pdf" }, "试卷.pdf")?.kind).toBe("pdf");
    expect(resolveFileType({ mime: "application/x-cfb" }, "教案.doc")).toEqual({
      mime: "application/msword",
      kind: "doc",
    });
    expect(resolveFileType({ mime: "audio/x-m4a" }, "录音.m4a")?.kind).toBe("audio");
    expect(resolveFileType({ mime: "image/heic" }, "IMG.HEIC")?.kind).toBe("other");
  });

  it("rejects HTML, scripts and unknown binaries", () => {
    expect(resolveFileType(undefined, "evil.html")).toBeNull();
    expect(resolveFileType({ mime: "application/x-msdownload" }, "a.exe")).toBeNull();
    expect(resolveFileType({ mime: "application/x-cfb" }, "unknown.bin")).toBeNull();
    expect(resolveFileType(undefined, "notes.txt")?.kind).toBe("doc");
  });

  it("builds safe download headers for Chinese names", () => {
    expect(sanitizeFileName('a/b\\c:"d".jpg')).toBe("a_b_c__d_.jpg");
    const header = contentDisposition("attachment", "第一页.jpg");
    expect(header).toContain("attachment;");
    expect(header).toContain("filename*=UTF-8''%E7%AC%AC%E4%B8%80%E9%A1%B5.jpg");
  });
});
