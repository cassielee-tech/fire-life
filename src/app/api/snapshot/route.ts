import { NextResponse } from "next/server";
import { localToday, snapshotToday } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const count = snapshotToday();
    return NextResponse.json({ ok: true, date: localToday(), count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "快照失败" },
      { status: 500 },
    );
  }
}
