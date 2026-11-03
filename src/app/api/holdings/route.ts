import { NextResponse } from "next/server";
import { createHolding, getCategory, listHoldings } from "@/db/queries";
import { holdingInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  return NextResponse.json(
    listHoldings(accountId ? Number(accountId) : undefined),
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = holdingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  if (
    parsed.data.categoryId !== undefined &&
    parsed.data.categoryId !== null &&
    !getCategory(parsed.data.categoryId)
  ) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }
  return NextResponse.json(createHolding(parsed.data), { status: 201 });
}
