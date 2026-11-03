"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui";
import {
  formatCompact,
  formatMoney,
  formatNumber,
  formatPct,
  toneClass,
} from "@/lib/format";
import {
  addMonths,
  buildFireScenarios,
  calculateFire,
  type FireInput,
} from "@/lib/fire";

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

function formatDuration(months: number | null): string {
  if (months === null) return "—";
  if (months === 0) return "已达成";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} 个月`;
  if (rest === 0) return `${years} 年`;
  return `${years} 年 ${rest} 个月`;
}

function formatMonthDate(date: string): string {
  const [year, month] = date.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[10px] leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function FireCalculator({
  currentAssets,
  currency,
  today,
}: {
  currentAssets: number;
  currency: string;
  today: string;
}) {
  const [assets, setAssets] = useState(String(Math.round(currentAssets)));
  const [target, setTarget] = useState("");
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [annualReturnPct, setAnnualReturnPct] = useState("6");
  const [considerInflation, setConsiderInflation] = useState(false);
  const [inflationPct, setInflationPct] = useState("2.5");
  const [age, setAge] = useState("");

  const currentAssetsValue = Math.max(0, Number(assets || 0));
  const targetValue = Math.max(0, Number(target || 0));
  const incomeValue = Math.max(0, Number(income || 0));
  const expenseValue = Math.max(0, Number(expense || 0));
  const annualSavings = Math.max(0, incomeValue - expenseValue);
  const annualReturn = Number(annualReturnPct || 0) / 100;
  const inflation = Number(inflationPct || 0) / 100;
  const currentAge = age === "" ? null : Math.max(0, Number(age));

  const input: FireInput = {
    currentAssets: currentAssetsValue,
    targetAmount: targetValue,
    annualSavings,
    annualReturn,
    inflation,
    considerInflation,
    currentAge,
  };

  const result = targetValue > 0 ? calculateFire(input) : null;
  const scenarios = targetValue > 0 ? buildFireScenarios(input) : [];
  const chartData = result?.points ?? [];
  const expenseWarning = expenseValue > incomeValue;

  const headline = !result
    ? "输入目标后开始计算"
    : result.reason === "already_reached"
      ? "已达成 FIRE 目标"
      : result.reached
        ? formatDuration(result.months)
        : result.reason === "no_savings_no_growth"
          ? "按当前参数无法达成"
          : "60 年内无法达成";

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">参数</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              金额按 {currency} 计算，收入只填主动收入，不含投资收益。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssets(String(Math.round(currentAssets)))}
            className="shrink-0 text-[11px] text-accent transition hover:underline"
          >
            使用当前总资产
          </button>
        </div>

        <div className="space-y-3">
          <Field
            label="当前可投资资产"
            hint={`总览当前总资产 ${formatMoney(currentAssets, currency, 0)}，可手动覆盖`}
          >
            <input
              type="number"
              min="0"
              step="any"
              value={assets}
              onChange={(e) => setAssets(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="目标 FIRE 金额" hint="按今天的购买力填写目标资产规模">
            <input
              type="number"
              min="0"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
              placeholder="如 3000000"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="预计税后年收入">
              <input
                type="number"
                min="0"
                step="any"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className={inputClass}
                placeholder="如 400000"
              />
            </Field>
            <Field label="年支出">
              <input
                type="number"
                min="0"
                step="any"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                className={inputClass}
                placeholder="如 200000"
              />
            </Field>
          </div>

          <div>
            <label className={labelClass}>年结余（自动）</label>
            <div className="flex h-[38px] items-center rounded-lg border border-border/60 bg-panel/40 px-3 text-sm text-muted">
              {formatMoney(annualSavings, currency, 0)} / 年
            </div>
            {expenseWarning ? (
              <p className="mt-1 text-[10px] text-gold">年支出高于收入，结余按 0 计算</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="预计年化收益（%）">
              <input
                type="number"
                min="0"
                step="0.1"
                value={annualReturnPct}
                onChange={(e) => setAnnualReturnPct(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="当前年龄（可选）">
              <input
                type="number"
                min="0"
                step="1"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
                placeholder="如 32"
              />
            </Field>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={considerInflation}
                onChange={(e) => setConsiderInflation(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              按实际购买力计算（考虑通胀）
            </label>
            <div className="mt-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={inflationPct}
                onChange={(e) => setInflationPct(e.target.value)}
                disabled={!considerInflation}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                placeholder="通胀率 %"
              />
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              开启后按实际收益率计算，目标和结余都按今天的购买力理解。
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-panel-2/50 px-3 py-2 text-[10px] leading-relaxed text-muted">
          假设：每月月末投入、按月复利；不考虑税费、波动和收入增长。
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                预计达成时间
              </div>
              <div
                className={`mt-1 text-3xl font-semibold tracking-tight ${
                  result?.reached ? "text-accent" : "text-gold"
                }`}
              >
                {headline}
              </div>
              <div className="mt-1 text-xs text-muted">
                {!result
                  ? "填写目标金额后，这里会显示预计年份。"
                  : result.reached && result.months !== null
                    ? `预计 ${formatMonthDate(addMonths(today, result.months))} 达成${
                        result.ageAtFire !== null
                          ? ` · 约 ${formatNumber(result.ageAtFire, 1)} 岁`
                          : ""
                      }`
                    : result.reason === "no_savings_no_growth"
                      ? "没有年结余，且收益率为 0，资产不会增长。"
                      : "按当前参数，60 年内无法达到目标。"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-muted">
                当前目标进度
              </div>
              <div className="num mt-1 text-lg font-semibold">
                {result ? `${formatNumber(result.progress * 100, 1)}%` : "—"}
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${Math.max((result?.progress ?? 0) * 100, 1)}%`,
              }}
            />
          </div>

          {result ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">目标金额</div>
                <div className="num mt-0.5 text-sm">{formatMoney(targetValue, currency, 0)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">每月投入</div>
                <div className="num mt-0.5 text-sm">
                  {formatMoney(result.monthlyContribution, currency, 0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  实际年化收益
                </div>
                <div className={`num mt-0.5 text-sm ${toneClass(result.effectiveAnnualReturn)}`}>
                  {formatPct(result.effectiveAnnualReturn)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">
                  {result.reached ? "达成时资产" : "60 年后资产"}
                </div>
                <div className="num mt-0.5 text-sm">
                  {formatMoney(result.finalBalance, currency, 0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">累计投入</div>
                <div className="num mt-0.5 text-sm">
                  {formatMoney(result.totalContributions, currency, 0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted">累计投资收益</div>
                <div className={`num mt-0.5 text-sm ${toneClass(result.totalGrowth)}`}>
                  {formatMoney(result.totalGrowth, currency, 0)}
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="资产增长曲线"
            subtitle="蓝色为资产，灰色虚线为累计投入，金色虚线为目标"
          />
          {chartData.length < 2 ? (
            <div className="grid h-[280px] place-items-center px-6 text-center text-sm text-muted">
              {!result
                ? "输入目标金额后显示曲线"
                : result.reason === "already_reached"
                  ? "当前资产已超过目标，无需增长曲线"
                  : "当前参数下没有可展示的增长曲线"}
            </div>
          ) : (
            <div className="h-[300px] w-full px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fireFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5aa2ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#5aa2ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--chart-grid)" }}
                    tickLine={false}
                    minTickGap={24}
                    tickFormatter={(value: number) => `${formatNumber(value, 0)}年`}
                  />
                  <YAxis
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                    tickFormatter={(value: number) => formatCompact(value, currency)}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--tooltip-bg)",
                      border: "1px solid var(--tooltip-border)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--tooltip-text)",
                    }}
                    labelStyle={{ color: "var(--chart-axis)" }}
                    labelFormatter={(value) => `${formatNumber(Number(value), 1)} 年`}
                    formatter={(value, name) => [
                      formatMoney(Number(value ?? 0), currency, 0),
                      name === "balance" ? "资产" : "累计投入",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="contributions"
                    stroke="#8a98a8"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    fill="none"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#5aa2ff"
                    strokeWidth={2}
                    fill="url(#fireFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <ReferenceLine
                    y={targetValue}
                    stroke="#e0b25c"
                    strokeDasharray="5 4"
                    label={{
                      value: "目标",
                      fill: "#e0b25c",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {scenarios.length > 0 ? (
          <Card>
            <CardHeader
              title="敏感性分析"
              subtitle="收益 ±2% 或年结余 ±20% 对达成时间的影响"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-3 font-medium">情景</th>
                    <th className="px-3 py-3 font-medium">达成时间</th>
                    <th className="px-3 py-3 font-medium">预计日期</th>
                    <th className="px-5 py-3 text-right font-medium">届时资产</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((scenario) => (
                    <tr
                      key={scenario.key}
                      className={`border-t border-border/50 ${
                        scenario.key === "base" ? "bg-panel-2/60" : ""
                      }`}
                    >
                      <td className="px-5 py-2.5 text-xs">
                        {scenario.label}
                        {scenario.key === "base" ? (
                          <span className="ml-2 text-[10px] text-accent">当前参数</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {scenario.result.months === null
                          ? "60 年内无法达成"
                          : formatDuration(scenario.result.months)}
                      </td>
                      <td className="num px-3 py-2.5 text-xs text-muted">
                        {scenario.result.months === null
                          ? "—"
                          : formatMonthDate(
                              addMonths(today, scenario.result.months),
                            )}
                      </td>
                      <td className="num px-5 py-2.5 text-right text-xs">
                        {formatMoney(scenario.result.finalBalance, currency, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {result && chartData.length > 1 ? (
          <Card>
            <CardHeader
              title="年度明细"
              subtitle="每月月末投入，年末余额"
              action={<span className="text-[10px] text-muted">{chartData.length - 1} 个年度节点</span>}
            />
            <div className="max-h-[380px] overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-3 font-medium">年份</th>
                    <th className="px-3 py-3 text-right font-medium">年末资产</th>
                    <th className="px-3 py-3 text-right font-medium">累计投入</th>
                    <th className="px-3 py-3 text-right font-medium">投资收益</th>
                    <th className="px-5 py-3 text-right font-medium">进度</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((point) => (
                    <tr
                      key={point.year}
                      className="border-t border-border/50 hover:bg-panel-2/50"
                    >
                      <td className="num px-5 py-2.5 text-xs">
                        {point.year === 0
                          ? "现在"
                          : `${formatNumber(point.year, 1)} 年`}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-xs">
                        {formatMoney(point.balance, currency, 0)}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-xs text-muted">
                        {formatMoney(point.contributions, currency, 0)}
                      </td>
                      <td className={`num px-3 py-2.5 text-right text-xs ${toneClass(point.growth)}`}>
                        {formatMoney(point.growth, currency, 0)}
                      </td>
                      <td className="num px-5 py-2.5 text-right text-xs text-muted">
                        {`${formatNumber(point.progress * 100, 1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
