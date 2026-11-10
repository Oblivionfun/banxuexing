import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { STUDENT_ID, dataDir, getDb } from "@/lib/db";
import { files, lessons, materialSets, students, subjects } from "@/lib/db/schema";
import type { LessonSource, LessonStatus, MaterialCategory } from "@/lib/enums";
import { storeBuffer } from "@/lib/storage";
import { addDays, todayKey, weekStart } from "@/lib/time";

type DemoLesson = {
  subject: string;
  offset: number;
  start: string;
  end: string;
  status: LessonStatus;
  topic?: string;
  summary?: string;
  homework?: string;
  prep?: string;
  source?: LessonSource;
};

const TEACHERS: Record<string, string> = {
  chinese: "王老师",
  math: "张老师",
  english: "李老师",
  physics: "陈老师",
  chemistry: "刘老师",
  biology: "赵老师",
  history: "孙老师",
  geography: "周老师",
  politics: "吴老师",
};

/** offset 相对本周一 */
const LESSONS: DemoLesson[] = [
  { subject: "math", offset: -5, start: "09:00", end: "10:30", status: "done", topic: "合并同类项", summary: "复习了整式加减，合并同类项基本没问题，去括号时符号容易出错。", homework: "练习册 P18–19", source: "wechat" },
  { subject: "english", offset: -4, start: "14:00", end: "15:30", status: "done", topic: "Unit 3 阅读", summary: "精读 Unit 3 课文，讲了一般过去时的不规则变化。阅读速度比上次快。", homework: "背诵 Unit 3 单词表\n完成阅读理解 B 篇", source: "meeting" },
  { subject: "math", offset: 0, start: "19:00", end: "20:30", status: "done", topic: "一元一次方程", summary: "今天讲了一元一次方程的解法，重点是**移项**和**合并同类项**。\n\n孩子掌握得不错，例题 1–4 都能独立做对；计算时还需要细心，有两处符号错误。\n\n- 移项要变号\n- 去分母时每一项都要乘", homework: "练习册 P23–25 第 1–6 题\n订正今天小测的错题", prep: "带三角板和量角器\n预习第四章第一节", source: "wechat" },
  { subject: "physics", offset: 1, start: "10:00", end: "11:30", status: "done", topic: "光的折射", summary: "通过实验视频理解折射现象，会画简单的折射光路图。", homework: "课本 P62 第 2、3 题", source: "meeting" },
  { subject: "chinese", offset: 1, start: "15:00", end: "16:30", status: "done" },
  { subject: "math", offset: 2, start: "09:00", end: "10:30", status: "planned" },
  { subject: "english", offset: 2, start: "14:00", end: "15:30", status: "planned" },
  { subject: "chemistry", offset: 2, start: "19:00", end: "20:30", status: "planned" },
  { subject: "chinese", offset: 3, start: "09:00", end: "10:30", status: "planned" },
  { subject: "biology", offset: 3, start: "14:00", end: "15:30", status: "planned" },
  { subject: "history", offset: 4, start: "09:00", end: "10:30", status: "planned" },
  { subject: "physics", offset: 4, start: "14:00", end: "15:30", status: "cancelled" },
  { subject: "geography", offset: 5, start: "10:00", end: "11:30", status: "planned" },
  { subject: "math", offset: 5, start: "15:00", end: "16:30", status: "planned" },
  { subject: "politics", offset: 6, start: "10:00", end: "11:30", status: "planned" },
  { subject: "english", offset: 6, start: "14:00", end: "15:30", status: "planned" },
];

const SETS: { subject: string; category: MaterialCategory; title: string; note: string; images: string[] }[] = [
  { subject: "math", category: "textbook", title: "七年级上册课本 第三章", note: "", images: ["m1.jpg", "m2.jpg", "m3.jpg"] },
  { subject: "math", category: "paper", title: "第三章单元测试卷", note: "周五小测前做完，错题订正后拍照发群里", images: ["p1.jpg"] },
  { subject: "english", category: "textbook", title: "Unit 3 课文与单词", note: "", images: ["e1.jpg"] },
];

const MATH_PLAN =
  "**本阶段目标**：两周内把一元一次方程和不等式的计算练熟，期中前完成第三、四章复习。\n\n**每次课安排**\n- 前 20 分钟订正上次作业\n- 中间讲新题型\n- 最后 15 分钟限时小测\n\n**需要家长配合**：每天督促完成练习册 2 页，拍照发到群里。";

/**
 * 演示模式（DEMO_MODE=1）下，空数据库启动时写入示例内容。
 * Vercel 上每个函数实例各有一份临时数据，所以编号必须固定，各实例之间才能互相对得上。
 */
export async function ensureDemoData(): Promise<void> {
  const db = getDb();
  if (db.select({ id: lessons.id }).from(lessons).limit(1).get()) return;

  const subjectIds = Object.fromEntries(
    db.select({ id: subjects.id, slug: subjects.slug }).from(subjects).all().map((row) => [row.slug, row.id]),
  );
  const monday = weekStart(todayKey());
  const imageDir = path.join(process.cwd(), "demo", "images");
  const root = dataDir();

  const stored = new Map<string, Awaited<ReturnType<typeof storeBuffer>>>();
  for (const set of SETS) {
    for (const name of set.images) {
      if (!stored.has(name)) {
        stored.set(name, await storeBuffer(root, await fs.readFile(path.join(imageDir, name)), name));
      }
    }
  }

  const now = new Date();
  db.transaction((tx) => {
    tx.update(students)
      .set({ grade: "初二", intro: "演示数据：上传和修改的内容会不定时重置" })
      .where(eq(students.id, STUDENT_ID))
      .run();
    for (const [slug, teacherName] of Object.entries(TEACHERS)) {
      tx.update(subjects).set({ teacherName }).where(eq(subjects.slug, slug)).run();
    }
    tx.update(subjects).set({ planMd: MATH_PLAN, planUpdatedAt: now }).where(eq(subjects.slug, "math")).run();

    for (const lesson of LESSONS) {
      tx.insert(lessons)
        .values({
          studentId: STUDENT_ID,
          subjectId: subjectIds[lesson.subject],
          date: addDays(monday, lesson.offset),
          startTime: lesson.start,
          endTime: lesson.end,
          status: lesson.status,
          topic: lesson.topic ?? "",
          summaryMd: lesson.summary ?? "",
          homework: lesson.homework ?? "",
          prep: lesson.prep ?? "",
          source: lesson.source ?? "manual",
        })
        .run();
    }

    SETS.forEach((set, setIndex) => {
      const row = tx
        .insert(materialSets)
        .values({ studentId: STUDENT_ID, subjectId: subjectIds[set.subject], category: set.category, title: set.title, note: set.note })
        .returning({ id: materialSets.id })
        .get();
      set.images.forEach((name, index) => {
        const blob = stored.get(name);
        if (!blob) return;
        tx.insert(files)
          .values({
            id: `demo-${setIndex + 1}-${index + 1}`,
            setId: row.id,
            originalName: name,
            mime: blob.mime,
            size: blob.size,
            sha256: blob.sha256,
            kind: blob.kind,
            width: blob.width,
            height: blob.height,
            sortOrder: index,
          })
          .run();
      });
    });
  });
}
