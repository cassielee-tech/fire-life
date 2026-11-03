"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLORS, formatCompact, formatMoney } from "@/lib/format";
import type { HistoryPoint } from "@/db/queries";
import type { Allocation } from "@/lib/valuation";

const COLORS = CATEGORY_COLORS;

const tooltipStyle = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--tooltip-text)",
};

export function AllocationDonut({
  data,
  currency,
  total,
  totalLabel = "总资产",
}: {
  data: Allocation[];
  currency: string;
  total: number;
  totalLabel?: string;
}) {
  if (data.length === 0) {
    return <div className="px-5 py-16 text-center text-sm text-muted">还没有持仓数据</div>;
  }

  return (
    <div className="flex flex-col items-center gap-2 px-3 py-3 sm:flex-row">
      <div className="relative h-[210px] w-full sm:w-[46%]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.key} fill={entry.color ?? COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: "var(--tooltip-text)" }}
              formatter={(value) => formatMoney(Number(value ?? 0), currency, 0)}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted">
              {totalLabel}
            </div>
            <div className="num mt-0.5 text-lg font-semibold">
              {formatCompact(total, currency)}
            </div>
          </div>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-2 px-2 sm:px-1">
        {data.map((item, index) => (
          <li key={item.key} className="flex items-center gap-2.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: item.color ?? COLORS[index % COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
            <span className="num text-ink">{formatCompact(item.value, currency)}</span>
            <span className="num w-12 text-right text-muted">
              {(item.weight * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AllocationPanel({
  byAsset,
  byCategory,
  currency,
  total,
  hasCategories,
  totalLabel = "总资产",
}: {
  byAsset: Allocation[];
  byCategory: Allocation[];
  currency: string;
  total: number;
  hasCategories: boolean;
  totalLabel?: string;
}) {
  const [view, setView] = useState<"asset" | "category">("asset");
  const data = view === "asset" ? byAsset : byCategory;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 px-4 pt-3">
        {(
          [
            { key: "asset", label: "资产类型" },
            { key: "category", label: "自定义分类" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
              view === tab.key
                ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "category" && !hasCategories ? (
        <div className="px-5 py-14 text-center text-sm text-muted">
          还没有自定义分类，
          <Link href="/categories" className="text-accent hover:underline">
            去创建
          </Link>
        </div>
      ) : (
        <AllocationDonut
          data={data}
          currency={currency}
          total={total}
          totalLabel={totalLabel}
        />
      )}
    </div>
  );
}

export function TrendChart({
  data,
  currency,
}: {
  data: HistoryPoint[];
  currency: string;
}) {
  if (data.length < 2) {
    return (
      <div className="grid h-[260px] place-items-center px-6 text-center text-sm text-muted">
        <div>
          <p>至少需要两天的快照才能画出曲线。</p>
          <p className="mt-1 text-xs">每天同步一次行情后，这里会记录净值走势。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5aa2ff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5aa2ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={58}
            tickFormatter={(v: number) => formatCompact(v, currency)}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "var(--tooltip-text)" }}
            labelStyle={{ color: "var(--chart-axis)" }}
            formatter={(value, name) => [
              formatMoney(Number(value ?? 0), currency, 0),
              name === "value" ? "总资产" : "成本",
            ]}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#8a98a8"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5aa2ff"
            strokeWidth={2}
            fill="url(#valueFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
