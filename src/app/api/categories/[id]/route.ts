import { NextResponse } from "next/server";
import {
  deleteCategory,
  findCategoryByName,
  getCategory,
  updateCategory,
} from "@/db/queries";
import { categoryPatch } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "分类 ID 非法" }, { status: 400 });
  }
  if (!getCategory(id)) {
    return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = categoryPatch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  if (parsed.data.name && findCategoryByName(parsed.data.name, id)) {
    return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
  }
  return NextResponse.json(updateCategory(id, parsed.data));
}

export async function DELETE(_request: Request, { params }: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "分类 ID 非法" }, { status: 400 });
  }
  if (!deleteCategory(id)) {
    return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
