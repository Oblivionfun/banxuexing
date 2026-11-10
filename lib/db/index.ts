import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getEnv } from "@/lib/env";
import { DEFAULT_STUDENT_NAME, DEFAULT_SUBJECTS } from "@/lib/subjects";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

type DbState = { db: Db; sqlite: Database.Database };

const globalForDb = globalThis as unknown as { __bxxDb?: DbState };

export const STUDENT_ID = 1;

export function dataDir(): string {
  return path.resolve(getEnv().DATA_DIR);
}

function seed(db: Db) {
  const existing = db.select().from(schema.students).limit(1).all();
  if (existing.length > 0) return;
  db.transaction((tx) => {
    tx.insert(schema.students).values({ id: STUDENT_ID, name: DEFAULT_STUDENT_NAME }).run();
    DEFAULT_SUBJECTS.forEach((subject, index) => {
      tx.insert(schema.subjects)
        .values({ studentId: STUDENT_ID, ...subject, sortOrder: index })
        .run();
    });
    tx.insert(schema.availability)
      .values(
        [3, 4, 5, 6, 7].map((weekday) => ({
          ownerType: "student" as const,
          weekday,
          startTime: "08:30",
          endTime: "21:00",
        })),
      )
      .run();
  });
}

function open(): DbState {
  const dir = path.join(dataDir(), "db");
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  seed(db);
  return { db, sqlite };
}

export function getDb(): Db {
  if (!globalForDb.__bxxDb) {
    globalForDb.__bxxDb = open();
  }
  return globalForDb.__bxxDb.db;
}

export function getSqlite(): Database.Database {
  getDb();
  return (globalForDb.__bxxDb as DbState).sqlite;
}
