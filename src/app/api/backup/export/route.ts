import { NextResponse } from "next/server";
import { sqlite } from "@/db";
import { buildBackup } from "@/db/backup";
import { backupFileName } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const backup = buildBackup(sqlite);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
