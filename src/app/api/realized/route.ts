import { NextResponse } from "next/server";
import {
  createRealizedTrade,
  getAccount,
  getCategory,
  listRealizedTrades,
} from "@/db/queries";
import { realizedInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listRealizedTrades());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = realizedInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  if (
    (parsed.data.pnl === undefined || parsed.data.pnl === null) &&
    parsed.data.proceeds === 0 &&
    parsed.data.costBasis === 0
  ) {
    return NextResponse.json(
      { error: "请填写已实现收益或卖出金额" },
      { status: 400 },
    );
  }
  if (!getAccount(parsed.data.accountId)) {
    return NextResponse.json({ error: "账户不存在" }, { status: 400 });
  }
  if (
    parsed.data.categoryId !== undefined &&
    parsed.data.categoryId !== null &&
    !getCategory(parsed.data.categoryId)
  ) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }
  return NextResponse.json(createRealizedTrade(parsed.data), { status: 201 });
}
