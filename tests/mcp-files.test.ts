import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertAllowed, scanFolder } from "@/mcp/api";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "bxx-mcp-"));
const outside = fs.mkdtempSync(path.join(os.tmpdir(), "bxx-outside-"));

beforeAll(() => {
  process.env.BXX_UPLOAD_ROOTS = root;
  fs.mkdirSync(path.join(root, "sub"));
  fs.writeFileSync(path.join(root, "a.txt"), "a");
  fs.writeFileSync(path.join(root, "b.PNG"), "b");
  fs.writeFileSync(path.join(root, ".hidden"), "hidden");
  fs.writeFileSync(path.join(root, "sub", "c.pdf"), "c");
  fs.writeFileSync(path.join(outside, "secret.txt"), "secret");
});

afterAll(() => {
  delete process.env.BXX_UPLOAD_ROOTS;
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

describe("mcp local files", () => {
  it("only allows files under the configured roots", async () => {
    await expect(assertAllowed(path.join(root, "a.txt"))).resolves.toContain("a.txt");
    await expect(assertAllowed(path.join(outside, "secret.txt"))).rejects.toThrow("只能读取");
  });

  it("scans without reading hidden files and filters extensions", async () => {
    const all = await scanFolder(root, { recursive: true });
    expect(all.map((file) => file.name).sort()).toEqual(["a.txt", "b.PNG", "c.pdf"]);

    const onlyImages = await scanFolder(root, { recursive: true, extensions: ["png"] });
    expect(onlyImages.map((file) => file.name)).toEqual(["b.PNG"]);
  });

  it("does not scan subdirectories unless asked", async () => {
    const flat = await scanFolder(root);
    expect(flat.map((file) => file.name).sort()).toEqual(["a.txt", "b.PNG"]);
  });
});
