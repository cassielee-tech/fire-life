import { NextResponse } from "next/server";
import { deleteSetting, getSetting, setSetting } from "@/db/queries";
import {
  buildFirePlan,
  FIRE_PLAN_KEY,
  firePlanInput,
  parseFirePlan,
} from "@/lib/fire-plan";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    plan: parseFirePlan(getSetting(FIRE_PLAN_KEY)),
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = firePlanInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const plan = buildFirePlan(parsed.data);
  setSetting(FIRE_PLAN_KEY, JSON.stringify(plan));
  return NextResponse.json({ plan });
}

export async function DELETE() {
  deleteSetting(FIRE_PLAN_KEY);
  return NextResponse.json({ ok: true });
}
