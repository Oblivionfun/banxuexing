import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import { blobPath, commitUpload, receiveStream, removeBlob, UploadError } from "@/lib/storage";
import { isValidWebhook, lessonMessage } from "@/lib/wecom";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "bxx-storage-"));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function streamOf(buffer: Buffer, chunk = 1024): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= buffer.length) {
        controller.close();
        return;
      }
      controller.enqueue(buffer.subarray(offset, offset + chunk));
      offset += chunk;
    },
  });
}

describe("storage", () => {
  it("stores images by content hash and generates derivatives", async () => {
    const image = await sharp({ create: { width: 2400, height: 3200, channels: 3, background: "#ffffff" } })
      .jpeg()
      .toBuffer();
    const received = await receiveStream(root, streamOf(image), 10 * 1024 * 1024);
    expect(received.size).toBe(image.length);
    const blob = await commitUpload(root, received, "page.jpg");
    expect(blob).toMatchObject({ kind: "image", mime: "image/jpeg", width: 1200, height: 1600 });
    expect(fs.existsSync(blobPath(root, blob.sha256, "original"))).toBe(true);
    expect(fs.existsSync(blobPath(root, blob.sha256, "preview"))).toBe(true);
    expect(fs.existsSync(blobPath(root, blob.sha256, "thumb"))).toBe(true);
    expect(fs.existsSync(received.tmpPath)).toBe(false);

    const again = await receiveStream(root, streamOf(image), 10 * 1024 * 1024);
    const second = await commitUpload(root, again, "copy.jpg");
    expect(second.sha256).toBe(blob.sha256);

    await removeBlob(root, blob.sha256);
    expect(fs.existsSync(blobPath(root, blob.sha256, "original"))).toBe(false);
  });

  it("aborts oversized uploads and leaves no temp files", async () => {
    const big = Buffer.alloc(5000, 1);
    await expect(receiveStream(root, streamOf(big), 4000)).rejects.toBeInstanceOf(UploadError);
    const leftovers = fs.readdirSync(path.join(root, "tmp")).filter((name) => name.endsWith(".part"));
    expect(leftovers).toEqual([]);
  });

  it("rejects disguised HTML", async () => {
    const html = Buffer.from("<!doctype html><script>alert(1)</script>");
    const received = await receiveStream(root, streamOf(html), 1024 * 1024);
    await expect(commitUpload(root, received, "photo.jpg")).rejects.toMatchObject({ status: 415 });
    expect(fs.existsSync(received.tmpPath)).toBe(false);
  });
});

describe("wecom", () => {
  it("validates webhook URLs", () => {
    expect(isValidWebhook("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcd-1234-efgh")).toBe(true);
    expect(isValidWebhook("https://evil.com/cgi-bin/webhook/send?key=abcd-1234")).toBe(false);
  });

  it("formats lesson notes as markdown within the size limit", () => {
    const message = lessonMessage({
      subjectName: "数学",
      teacherName: "张老师",
      dateText: "11月11日 周三",
      topic: "一元一次方程",
      summary: "讲".repeat(2000),
      homework: "1. 练习册 P23\n2. 订正错题",
      prep: "带三角板",
      link: "https://example.com/s/token?next=%2Flessons%2F1",
    });
    expect(message).toContain("**数学课程纪要｜11月11日 周三**");
    expect(message).toContain('<font color="warning">1. 练习册 P23</font>');
    expect(message).toContain("[打开学习档案查看详情](https://example.com/s/token?next=%2Flessons%2F1)");
    expect(new TextEncoder().encode(message).length).toBeLessThanOrEqual(4000);
  });
});
