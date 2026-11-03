import { NextResponse } from "next/server";
import { deleteAccount, updateAccount } from "@/db/queries";
import { accountPatch } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "账户 ID 非法" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = accountPatch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  const updated = updateAccount(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "账户 ID 非法" }, { status: 400 });
  }
  if (!deleteAccount(id)) return NextResponse.json({ error: "账户不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
