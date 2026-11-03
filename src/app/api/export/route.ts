import { NextResponse } from "next/server";
import { getPortfolio, listAccounts } from "@/db/queries";

export const dynamic = "force-dynamic";

function esc(value: string | number | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const portfolio = getPortfolio();
  const accounts = listAccounts();
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(
    portfolio.categories.map((category) => [category.id, category.name]),
  );
  const header = [
    "账户",
    "持仓",
    "资产类型",
    "自定义分类",
    "市场",
    "代码",
    "币种",
    "数量",
    "成本",
    "成本价",
    "市价",
    "市值",
    "浮动盈亏",
    "收益率",
    "当日涨跌",
    "占比",
    "价格日期",
    "价格来源",
  ];

  const lines = [header.join(",")];
  for (const v of portfolio.valuations) {
    lines.push(
      [
        accountNames.get(v.accountId) ?? "",
        v.name,
        v.assetType,
        v.categoryId === null ? "" : (categoryNames.get(v.categoryId) ?? ""),
        v.market,
        v.symbol.toUpperCase(),
        v.currency,
        v.quantity,
        v.cost,
        ["stock", "fund", "wealth", "gold"].includes(v.assetType) &&
          v.costPrice !== null
          ? Number(v.costPrice.toFixed(6))
          : "",
        v.price,
        v.marketValue,
        v.pnl,
        v.pnlPct === null ? "" : (v.pnlPct * 100).toFixed(2),
        v.dayChange,
        (v.weight * 100).toFixed(2),
        v.priceDate ?? "",
        v.priceSource,
      ]
        .map(esc)
        .join(","),
    );
  }

  const csv = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assets-${portfolio.today}.csv"`,
    },
  });
}
