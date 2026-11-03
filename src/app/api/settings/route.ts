import { NextResponse } from "next/server";
import { getBaseCurrency, setSetting } from "@/db/queries";
import { settingsInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ baseCurrency: getBaseCurrency() });
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const parsed = settingsInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  setSetting("base_currency", parsed.data.baseCurrency);
  return NextResponse.json({ baseCurrency: parsed.data.baseCurrency });
}
