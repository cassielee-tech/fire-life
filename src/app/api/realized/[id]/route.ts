import { NextResponse } from "next/server";
import {
  getAccount,
  getCategory,
  getRealizedTrade,
  removeRealizedTrade,
  updateRealizedTrade,
} from "@/db/queries";
import { realizedPatch } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "收益记录 ID 非法" }, { status: 400 });
  }
  const trade = getRealizedTrade(id);
  if (!trade) {
    return NextResponse.json({ error: "收益记录不存在" }, { status: 404 });
  }
  if (trade.holdingId !== null) {
    return NextResponse.json(
      { error: "卖出产生的记录不支持编辑，请撤销后重新卖出" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = realizedPatch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  if (
    parsed.data.accountId !== undefined &&
    !getAccount(parsed.data.accountId)
  ) {
    return NextResponse.json({ error: "账户不存在" }, { status: 400 });
  }
  if (
    parsed.data.categoryId !== undefined &&
    parsed.data.categoryId !== null &&
    !getCategory(parsed.data.categoryId)
  ) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }
  return NextResponse.json(updateRealizedTrade(id, parsed.data));
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "收益记录 ID 非法" }, { status: 400 });
  }
  try {
    const result = removeRealizedTrade(id);
    if (!result.removed) {
      return NextResponse.json({ error: "收益记录不存在" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, restored: result.restored });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "撤销失败" },
      { status: 409 },
    );
  }
}
