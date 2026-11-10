import { expect, test, type Page } from "@playwright/test";

const SHARE_PATH = "/s/e2eShareToken_0123456789";
const PASSCODE = "e2e-pass-123";

// 两张不同的 1×1 PNG，用来测试多文件上传
const PNG_A = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
  "base64",
);
const PNG_B = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC",
  "base64",
);

function todayInBeijing(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("管理口令").fill(PASSCODE);
  await page.getByRole("button", { name: "进入管理" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe.configure({ mode: "serial" });

test("没有链接时提示用专属链接打开，点开链接后可以浏览", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/denied/);
  await expect(page.getByRole("heading", { name: "请用工作人员发给您的链接打开" })).toBeVisible();

  await page.goto("/s/wrong-token-value");
  await expect(page.getByRole("heading", { name: "这个链接已经失效" })).toBeVisible();

  await page.goto(SHARE_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("的学习档案");
  await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "课表" }).click();
  await expect(page.getByRole("heading", { name: "课表", level: 1 })).toBeVisible();
});

test("口令错误会提示，登录后上传多张照片，家长端能看大图", async ({ page }) => {
  await page.goto("/admin/upload");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("管理口令").fill("not-the-passcode");
  await page.getByRole("button", { name: "进入管理" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "口令不对" })).toBeVisible();

  await page.getByLabel("管理口令").fill(PASSCODE);
  await page.getByRole("button", { name: "进入管理" }).click();
  await expect(page).toHaveURL(/\/admin\/upload/);

  await page.getByRole("radio", { name: "数学" }).click();
  await page.getByLabel("标题").fill("E2E 课本第一章");
  await page.locator("#uploader-input").setInputFiles([
    { name: "第一页.png", mimeType: "image/png", buffer: PNG_A },
    { name: "第二页.png", mimeType: "image/png", buffer: PNG_B },
  ]);
  await page.getByRole("button", { name: /开始上传（2 个）/ }).click();
  await expect(page.getByText("上传完成")).toBeVisible();

  await page.getByRole("link", { name: "看看家长端效果" }).click();
  await expect(page.getByRole("heading", { name: "E2E 课本第一章" })).toBeVisible();
  await expect(page.getByRole("button", { name: /查看第 2 张/ })).toBeVisible();
  await page.getByRole("button", { name: /查看第 1 张/ }).click();
  await expect(page.getByRole("button", { name: "下载原图" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "下载原图" })).toBeHidden();

  const zip = await page.request.get(
    (await page.getByRole("link", { name: "打包下载全部" }).getAttribute("href")) as string,
  );
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
});

test("粘贴老师总结自动拆分，保存后家长端出现老师布置", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/lessons/new");
  await page.getByRole("radio", { name: "英语" }).click();
  await page.getByLabel("日期").fill(todayInBeijing());
  await page.getByLabel("开始").fill("09:00");
  await expect(page.getByLabel("结束")).toHaveValue("10:30");

  await page
    .getByLabel("老师原文")
    .fill("今天讲了一般过去时，孩子掌握得不错。\n作业：背诵 Unit 3 单词\n完成阅读 B 篇\n下节课：带英汉词典");
  await page.getByRole("button", { name: "整理到下面" }).click();
  await expect(page.getByLabel("课后作业")).toHaveValue("背诵 Unit 3 单词\n完成阅读 B 篇");
  await expect(page.getByLabel("下节课准备")).toHaveValue("带英汉词典");
  await page.getByLabel("主题（可选）").fill("一般过去时");

  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/lessons\/\d+\?saved=1/);
  const lessonId = /\/admin\/lessons\/(\d+)/.exec(page.url())?.[1];

  await page.goto(`/lessons/${lessonId}`);
  await expect(page.getByRole("heading", { name: "一般过去时", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "老师布置" })).toBeVisible();
  await expect(page.getByText("背诵 Unit 3 单词")).toBeVisible();
  await expect(page.getByText("带英汉词典")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("region", { name: "老师最近布置" })).toContainText("背诵 Unit 3 单词");
});

test("同一时间段重复排课时先提醒冲突", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/lessons/new");
  await page.getByRole("radio", { name: "物理" }).click();
  await page.getByLabel("日期").fill(todayInBeijing());
  await page.getByLabel("开始").fill("09:30");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "冲突" })).toBeVisible();
  await page.getByRole("button", { name: "仍然保存" }).click();
  await expect(page).toHaveURL(/\/admin\/lessons\/\d+\?saved=1/);
});

test.describe("手机微信", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 MicroMessenger/8.0.50",
  });

  test("页面不横向溢出，资料页提示在浏览器打开", async ({ page }) => {
    await page.goto(SHARE_PATH);
    await expect(page.getByRole("list", { name: "选择日期" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "资料" }).click();
    await page.getByRole("link", { name: /E2E 课本第一章/ }).click();
    await expect(page.getByText("在浏览器打开")).toBeVisible();
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(pageOverflow).toBeLessThanOrEqual(0);
  });
});
