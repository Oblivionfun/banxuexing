#!/usr/bin/env node
// 在线备份 SQLite（不停服务），校验备份完整性，并清理过期备份。
// 容器内：docker compose exec -T app node scripts/backup.mjs
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir = path.resolve(process.env.DATA_DIR ?? "./data");
const keepDays = Number(process.env.BACKUP_KEEP_DAYS ?? 14);
const source = path.join(dataDir, "db", "app.db");
const backupDir = path.join(dataDir, "backups");

if (!fs.existsSync(source)) {
  console.error(`[backup] 找不到数据库：${source}`);
  process.exit(1);
}
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})
  .format(new Date())
  .replace(/[ :]/g, "-");
const target = path.join(backupDir, `app-${stamp}.db`);
const partial = `${target}.part`;

const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(partial);
} finally {
  db.close();
}

// 备份文件改成单文件日志模式，避免留下 -wal / -shm 附属文件
const check = new Database(partial);
check.pragma("journal_mode = DELETE");
const integrity = check.pragma("integrity_check", { simple: true });
const counts = {
  lessons: check.prepare("select count(*) as n from lessons").get().n,
  materials: check.prepare("select count(*) as n from material_sets").get().n,
  files: check.prepare("select count(*) as n from files").get().n,
};
check.close();
if (integrity !== "ok") {
  fs.rmSync(partial, { force: true });
  console.error(`[backup] 备份校验失败：${integrity}`);
  process.exit(1);
}
fs.renameSync(partial, target);

const cutoff = Date.now() - keepDays * 86_400_000;
let pruned = 0;
for (const name of fs.readdirSync(backupDir)) {
  if (!/^app-.*\.db$/.test(name)) continue;
  const file = path.join(backupDir, name);
  if (fs.statSync(file).mtimeMs < cutoff) {
    fs.rmSync(file);
    pruned += 1;
  }
}

console.log(
  `[backup] ${path.basename(target)} 完成：${counts.lessons} 节课，${counts.materials} 册资料，${counts.files} 个文件；清理过期备份 ${pruned} 个`,
);
