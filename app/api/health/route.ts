import fsp from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { dataDir, getSqlite } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getSqlite().prepare("select 1").get();
    const probe = path.join(dataDir(), "tmp", ".health");
    await fsp.mkdir(path.dirname(probe), { recursive: true });
    await fsp.writeFile(probe, String(Date.now()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[health] failed", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
