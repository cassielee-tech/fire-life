import path from "node:path";
import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import { restoreBackup, writePreImportBackup } from "@/db/backup";
import { MAX_BACKUP_BYTES, validateBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return NextResponse.json({ error: "读取上传内容失败" }, { status: 400 });
  }

  if (Buffer.byteLength(text, "utf8") > MAX_BACKUP_BYTES) {
    return NextResponse.json(
      { error: "备份文件过大，最大支持 50 MB" },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "备份文件不是合法的 JSON" },
      { status: 400 },
    );
  }

  const validation = validateBackup(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const backupDir = path.join(process.cwd(), "data", "backups");
  let backupFile: string;
  try {
    backupFile = writePreImportBackup(sqlite, backupDir);
  } catch (err) {
    return NextResponse.json(
      {
        error: `无法写入导入前备份，已取消导入：${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 500 },
    );
  }

  try {
    const result = restoreBackup(sqlite, validation.backup);
    return NextResponse.json({
      ok: true,
      counts: result.counts,
      backupFile: path.relative(process.cwd(), backupFile),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `导入失败，数据库已回滚：${
          err instanceof Error ? err.message : String(err)
        }`,
        backupFile: path.relative(process.cwd(), backupFile),
      },
      { status: 500 },
    );
  }
}
