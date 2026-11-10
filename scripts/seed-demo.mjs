#!/usr/bin/env node
// 仅用于本地预览界面：写入演示课程、纪要和资料。不要在服务器上运行。
// 用法：先启动 dev 服务器，再执行 node scripts/seed-demo.mjs [http://localhost:3100]
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

if (process.env.NODE_ENV === "production") {
  console.error("拒绝在生产环境写入演示数据");
  process.exit(1);
}

const base = process.argv[2] ?? "http://localhost:3100";
const secret = process.env.SESSION_SECRET ?? "dev-session-secret-0123456789abcdef0123456789";
const passcode = process.env.ADMIN_PASSCODE ?? "123456";
const adminCookie = `bxx_admin=${createHmac("sha256", secret).update(`admin:${passcode}`).digest("base64url")}`;
const db = new Database(path.resolve(process.env.DATA_DIR ?? "./data", "db/app.db"));
db.pragma("foreign_keys = ON");

const now = Date.now();
const fmt = (date) => date.toISOString().slice(0, 10);
const todayDate = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())}T00:00:00Z`);
const monday = new Date(todayDate);
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
const day = (offset) => {
  const date = new Date(monday);
  date.setUTCDate(date.getUTCDate() + offset);
  return fmt(date);
};

const subjects = Object.fromEntries(db.prepare("select id, slug from subjects").all().map((row) => [row.slug, row.id]));

db.prepare("update students set grade = ?, intro = ? where id = 1").run("初二", "本地演示数据，部署前会清空");
const teachers = {
  chinese: "王老师", math: "张老师", english: "李老师", physics: "陈老师", chemistry: "刘老师",
  biology: "赵老师", history: "孙老师", geography: "周老师", politics: "吴老师",
};
for (const [slug, name] of Object.entries(teachers)) {
  db.prepare("update subjects set teacher_name = ? where slug = ?").run(name, slug);
}
db.prepare("update subjects set plan_md = ?, plan_updated_at = ? where slug = 'math'").run(
  "**本阶段目标**：两周内把一元一次方程和不等式的计算练熟，期中前完成第三、四章复习。\n\n**每次课安排**\n- 前 20 分钟订正上次作业\n- 中间讲新题型\n- 最后 15 分钟限时小测\n\n**需要家长配合**：每天督促完成练习册 2 页，拍照发到群里。",
  now,
);

const insertLesson = db.prepare(`insert into lessons
  (student_id, subject_id, date, start_time, end_time, status, topic, summary_md, homework, prep, source, created_at, updated_at)
  values (1, @subject, @date, @start, @end, @status, @topic, @summary, @homework, @prep, @source, ${now}, ${now})`);

const lessons = [
  { subject: "math", date: day(-5), start: "09:00", end: "10:30", status: "done", topic: "合并同类项", summary: "复习了整式加减，合并同类项基本没问题，去括号时符号容易出错。", homework: "练习册 P18–19", prep: "", source: "wechat" },
  { subject: "english", date: day(-4), start: "14:00", end: "15:30", status: "done", topic: "Unit 3 阅读", summary: "精读 Unit 3 课文，讲了一般过去时的不规则变化。阅读速度比上次快。", homework: "背诵 Unit 3 单词表\n完成阅读理解 B 篇", prep: "", source: "meeting" },
  { subject: "math", date: day(0), start: "19:00", end: "20:30", status: "done", topic: "一元一次方程", summary: "今天讲了一元一次方程的解法，重点是**移项**和**合并同类项**。\n\n孩子掌握得不错，例题 1–4 都能独立做对；计算时还需要细心，有两处符号错误。\n\n- 移项要变号\n- 去分母时每一项都要乘", homework: "练习册 P23–25 第 1–6 题\n订正今天小测的错题", prep: "带三角板和量角器\n预习第四章第一节", source: "wechat" },
  { subject: "physics", date: day(1), start: "10:00", end: "11:30", status: "done", topic: "光的折射", summary: "通过实验视频理解折射现象，会画简单的折射光路图。", homework: "课本 P62 第 2、3 题", prep: "", source: "meeting" },
  { subject: "chinese", date: day(1), start: "15:00", end: "16:30", status: "done", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "math", date: day(2), start: "09:00", end: "10:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "english", date: day(2), start: "14:00", end: "15:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "chemistry", date: day(2), start: "19:00", end: "20:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "chinese", date: day(3), start: "09:00", end: "10:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "biology", date: day(3), start: "14:00", end: "15:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "history", date: day(4), start: "09:00", end: "10:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "physics", date: day(4), start: "14:00", end: "15:30", status: "cancelled", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "geography", date: day(5), start: "10:00", end: "11:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "math", date: day(5), start: "15:00", end: "16:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "politics", date: day(6), start: "10:00", end: "11:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
  { subject: "english", date: day(6), start: "14:00", end: "15:30", status: "planned", topic: "", summary: "", homework: "", prep: "", source: "manual" },
];
for (const lesson of lessons) insertLesson.run({ ...lesson, subject: subjects[lesson.subject] });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bxx-demo-"));
const font = "/System/Library/Fonts/STHeiti Medium.ttc";
function page(name, title, lines, tint = "#fbfaf6") {
  const file = path.join(tmp, name);
  const args = ["-size", "1240x1754", `xc:${tint}`, "-font", font, "-fill", "#222", "-pointsize", "52", "-annotate", "+110+190", title, "-pointsize", "34"];
  lines.forEach((line, index) => args.push("-annotate", `+110+${300 + index * 78}`, line));
  args.push("-quality", "85", file);
  execFileSync("magick", args);
  return file;
}

const sets = [
  { subject: "math", category: "textbook", title: "七年级上册课本 第三章", pages: [
    page("m1.jpg", "第三章 一元一次方程", ["3.1 从算式到方程", "问题 1：用一元一次方程分析数量关系", "例 1 根据下列问题，设未知数并列出方程：", "（1）用一根长 24 cm 的铁丝围成一个正方形，", "正方形的边长是多少？", "（2）一台计算机已使用 1 700 小时，", "预计每月再使用 150 小时……"]),
    page("m2.jpg", "3.2 解一元一次方程（一）", ["——合并同类项与移项", "例 2 解方程：", "（1）2x − 5x/2 = 3", "（2）7x − 2.5x + 3x − 1.5x = −15 × 4 − 6 × 3", "练习", "1. 解下列方程：", "（1）5x − 2x = 9    （2）x/2 + 3x/2 = 7"]),
    page("m3.jpg", "3.3 解一元一次方程（二）", ["——去括号与去分母", "例 1 解方程 3x − 7(x − 1) = 3 − 2(x + 3)", "去括号，得 3x − 7x + 7 = 3 − 2x − 6", "移项，得 3x − 7x + 2x = 3 − 6 − 7", "合并同类项，得 −2x = −10", "系数化为 1，得 x = 5"]),
  ] },
  { subject: "math", category: "paper", title: "第三章单元测试卷", pages: [
    page("p1.jpg", "第三章 单元测试（满分 100 分）", ["一、选择题（每题 3 分，共 30 分）", "1. 下列方程中，是一元一次方程的是（  ）", "A. x² − 4x = 3   B. x = 0   C. x + 2y = 1   D. 1/x = 2", "2. 方程 2x − 1 = 3 的解是（  ）", "二、填空题（每题 3 分，共 18 分）", "11. 若 x = 2 是方程 3x − a = 0 的解，则 a = ____"], "#ffffff"),
  ] },
  { subject: "english", category: "textbook", title: "Unit 3 课文与单词", pages: [
    page("e1.jpg", "Unit 3  Is this your pencil?", ["Section A  1a Match the words with the things.", "pencil  pen  book  eraser  ruler", "pencil case  backpack  dictionary", "1b Listen and number the conversations.", "A: Excuse me, Grace. Is this your pencil?", "B: Yes, thank you."]),
  ] },
];

const insertSet = db.prepare(`insert into material_sets (student_id, subject_id, category, title, note, created_at, updated_at)
  values (1, ?, ?, ?, ?, ${now}, ${now}) returning id`);
for (const set of sets) {
  const { id } = insertSet.get(subjects[set.subject], set.category, set.title, set.category === "paper" ? "周五小测前做完，错题订正后拍照发群里" : "");
  for (const file of set.pages) {
    const body = fs.readFileSync(file);
    const response = await fetch(`${base}/api/upload?setId=${id}`, {
      method: "POST",
      headers: {
        cookie: adminCookie,
        "x-file-name": encodeURIComponent(path.basename(file)),
        "x-file-size": String(body.length),
        "content-type": "application/octet-stream",
      },
      body,
    });
    if (!response.ok) throw new Error(`上传失败：${await response.text()}`);
  }
}
console.log(`已写入 ${lessons.length} 节课、${sets.length} 册资料（本地演示数据）`);
