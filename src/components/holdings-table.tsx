"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import {
  ASSET_TYPE_OPTIONS,
  MARKET_OPTIONS,
  PRICE_SOURCE_LABELS,
  formatMoney,
  formatNumber,
  formatPct,
  toneClass,
} from "@/lib/format";
import type { HoldingValuation } from "@/lib/valuation";

const ASSET_LABELS = new Map(ASSET_TYPE_OPTIONS.map((o) => [o.value, o.label]));
const MARKET_LABELS = new Map(MARKET_OPTIONS.map((o) => [o.value, o.label]));

type SortKey =
  | "name"
  | "type"
  | "quantity"
  | "cost"
  | "price"
  | "marketValue"
  | "pnl"
  | "dayChange"
  | "weight";

const TEXT_SORT_KEYS: SortKey[] = ["name", "type"];

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onToggle,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onToggle: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      className={`${className} ${align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-ink ${
          active ? "text-ink" : "text-muted"
        }`}
      >
        {label}
        <span
          className={`text-[9px] ${
            active ? "text-accent" : "text-muted/50"
          }`}
        >
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function HoldingsTable({
  valuations,
  accountNames,
  categoryNames,
  currency,
  limit,
}: {
  valuations: HoldingValuation[];
  accountNames: Record<number, string>;
  categoryNames: Record<number, string>;
  currency: string;
  limit?: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "marketValue",
    dir: "desc",
  });

  const rows = useMemo(() => {
    const sorted = [...valuations];
    const multiplier = sort.dir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "name":
          cmp = a.name.localeCompare(b.name, "zh-CN");
          break;
        case "type":
          cmp = (ASSET_LABELS.get(a.assetType) ?? a.assetType).localeCompare(
            ASSET_LABELS.get(b.assetType) ?? b.assetType,
            "zh-CN",
          );
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
        case "cost":
          cmp = a.cost - b.cost;
          break;
        case "price":
          cmp = (a.price ?? 0) - (b.price ?? 0);
          break;
        case "pnl":
          cmp = a.pnl - b.pnl;
          break;
        case "dayChange":
          cmp = a.dayChange - b.dayChange;
          break;
        case "weight":
          cmp = a.weight - b.weight;
          break;
        case "marketValue":
        default:
          cmp = a.marketValue - b.marketValue;
          break;
      }
      if (cmp === 0) cmp = a.id - b.id;
      return cmp * multiplier;
    });

    return limit ? sorted.slice(0, limit) : sorted;
  }, [valuations, sort, limit]);

  function toggle(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return {
        key,
        dir: TEXT_SORT_KEYS.includes(key) ? "asc" : "desc",
      };
    });
  }

  if (rows.length === 0) {
    return (
      <div className="px-5 py-14 text-center text-sm text-muted">
        还没有持仓，
        <Link href="/holdings" className="text-accent hover:underline">
          去添加第一笔
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <SortHeader
              label="持仓"
              sortKey="name"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              className="px-5 py-3 font-medium"
            />
            <SortHeader
              label="类型"
              sortKey="type"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="数量"
              sortKey="quantity"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="成本"
              sortKey="cost"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="现价"
              sortKey="price"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="市值"
              sortKey="marketValue"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="浮动盈亏"
              sortKey="pnl"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="当日"
              sortKey="dayChange"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-3 py-3 font-medium"
            />
            <SortHeader
              label="占比"
              sortKey="weight"
              activeKey={sort.key}
              dir={sort.dir}
              onToggle={toggle}
              align="right"
              className="px-5 py-3 font-medium"
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id} className="border-t border-border/50 hover:bg-panel-2/50">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{v.name}</span>
                  {v.symbol ? (
                    <span className="num rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">
                      {v.symbol.toUpperCase()}
                    </span>
                  ) : null}
                  {v.stale ? <Badge tone="warn">价格滞后</Badge> : null}
                  {v.priceSource === "missing" ? <Badge tone="danger">缺价</Badge> : null}
                  {v.missingFx ? <Badge tone="danger">缺汇率</Badge> : null}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {accountNames[v.accountId] ?? "未归属账户"}
                  {v.categoryId !== null && categoryNames[v.categoryId]
                    ? ` · ${categoryNames[v.categoryId]}`
                    : ""}
                  {" · "}
                  {v.currency}
                  {v.priceDate ? ` · ${v.priceDate}` : ""}
                  {" · "}
                  {PRICE_SOURCE_LABELS[v.priceSource] ?? v.priceSource}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="text-xs text-ink">{ASSET_LABELS.get(v.assetType) ?? v.assetType}</div>
                <div className="text-[10px] text-muted">
                  {MARKET_LABELS.get(v.market) ?? v.market}
                </div>
              </td>
              <td className="num px-3 py-3 text-right text-xs text-muted">
                {["cash", "deposit", "other"].includes(v.assetType)
                  ? "—"
                  : formatNumber(v.quantity, v.quantity % 1 === 0 ? 0 : 2)}
              </td>
              <td className="num px-3 py-3 text-right text-xs text-muted">
                <div>{formatMoney(v.cost, currency, 0)}</div>
                {["stock", "fund", "wealth", "gold"].includes(v.assetType) &&
                v.costPrice !== null ? (
                  <div className="text-[10px]">
                    成本价 {formatNumber(v.costPrice, v.costPrice < 10 ? 4 : 2)}{" "}
                    {v.currency}
                  </div>
                ) : null}
              </td>
              <td className="num px-3 py-3 text-right text-xs">
                {v.price === null ? (
                  <span className="text-muted">手动</span>
                ) : (
                  <>
                    <div>{formatNumber(v.price, v.price < 10 ? 4 : 2)}</div>
                    <div className="text-[10px] text-muted">
                      {v.assetType === "wealth"
                        ? `净值 · ${v.currency}`
                        : v.assetType === "gold"
                          ? `金价 · ${v.currency}`
                          : v.currency}
                    </div>
                  </>
                )}
              </td>
              <td className="num px-3 py-3 text-right font-medium">
                {formatMoney(v.marketValue, currency, 0)}
              </td>
              <td className={`num px-3 py-3 text-right ${toneClass(v.pnl)}`}>
                <div>{formatMoney(v.pnl, currency, 0)}</div>
                <div className="text-[10px] opacity-80">{formatPct(v.pnlPct)}</div>
              </td>
              <td className={`num px-3 py-3 text-right ${toneClass(v.dayChange)}`}>
                <div>{v.dayChange === 0 ? "—" : formatMoney(v.dayChange, currency, 0)}</div>
                <div className="text-[10px] opacity-80">{formatPct(v.dayChangePct)}</div>
              </td>
              <td className="num px-5 py-3 text-right text-xs text-muted">
                {(v.weight * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
