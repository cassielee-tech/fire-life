import { NextResponse } from "next/server";
import { createCategory, findCategoryByName, listCategories } from "@/db/queries";
import { categoryInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listCategories());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = categoryInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  if (findCategoryByName(parsed.data.name)) {
    return NextResponse.json({ error: "分类名称已存在" }, { status: 400 });
  }
  return NextResponse.json(createCategory(parsed.data), { status: 201 });
}
