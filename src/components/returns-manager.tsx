"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui";
import {
  ASSET_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  formatMoney,
  formatNumber,
  formatPct,
  toneClass,
} from "@/lib/format";
import { realizedPnl, summarizeRealized } from "@/lib/returns";
import { makeFx, type AssetType, type FxPair } from "@/lib/valuation";
import type { RealizedTrade } from "@/db/schema";

type AccountOption = { id: number; name: string; currency: string };
type CategoryOption = { id: number; name: string; color: string };

type FormMode = "detail" | "profit";

type FormState = {
  id: number | null;
  mode: FormMode;
  accountId: string;
  categoryId: string;
  name: string;
  symbol: string;
  assetType: AssetType;
  currency: string;
  sellDate: string;
  quantity: string;
  costBasis: string;
  proceeds: string;
  pnl: string;
  fee: string;
  note: string;
};

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

function emptyForm(accounts: AccountOption[], today: string): FormState {
  return {
    id: null,
    mode: "detail",
    accountId: accounts[0] ? String(accounts[0].id) : "",
    categoryId: "",
    name: "",
    symbol: "",
    assetType: "other",
    currency: accounts[0]?.currency ?? "CNY",
    sellDate: today,
    quantity: "0",
    costBasis: "",
    proceeds: "",
    pnl: "",
    fee: "0",
    note: "",
  };
}

function fromTrade(trade: RealizedTrade): FormState {
  return {
    id: trade.id,
    mode: trade.pnl === null ? "detail" : "profit",
    accountId: String(trade.accountId),
    categoryId: trade.categoryId === null ? "" : String(trade.categoryId),
    name: trade.name,
    symbol: trade.symbol,
    assetType: trade.assetType,
    currency: trade.currency,
    sellDate: trade.sellDate,
    quantity: String(trade.quantity),
    costBasis: String(trade.costBasis),
    proceeds: String(trade.proceeds),
    pnl: trade.pnl === null ? "" : String(trade.pnl),
    fee: String(trade.fee),
    note: trade.note,
  };
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${tone ?? "text-ink"}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-muted">{sub}</div> : null}
    </Card>
  );
}

export function ReturnsManager({
  trades,
  accounts,
  categories,
  fxPairs,
  baseCurrency,
  currentFloating,
  today,
}: {
  trades: RealizedTrade[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  fxPairs: FxPair[];
  baseCurrency: string;
  currentFloating: number;
  today: string;
}) {
  const router = useRouter();
  const currentYear = today.slice(0, 4);
  const [year, setYear] = useState(currentYear);
  const [form, setForm] = useState<FormState>(() => emptyForm(accounts, today));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const fx = useMemo(() => makeFx(fxPairs), [fxPairs]);
  const yearSummary = useMemo(
    () => summarizeRealized(trades, fx, baseCurrency, year),
    [trades, fx, baseCurrency, year],
  );
  const allSummary = useMemo(
    () => summarizeRealized(trades, fx, baseCurrency, null),
    [trades, fx, baseCurrency],
  );

  const years = useMemo(() => {
    const values = new Set<string>([currentYear]);
    for (const trade of trades) values.add(trade.sellDate.slice(0, 4));
    return [...values].sort((a, b) => b.localeCompare(a));
  }, [trades, currentYear]);

  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filtered = useMemo(
    () => trades.filter((trade) => trade.sellDate.startsWith(`${year}-`)),
    [trades, year],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeAccount(accountId: string) {
    setForm((prev) => {
      const account = accounts.find((a) => String(a.id) === accountId);
      return {
        ...prev,
        accountId,
        currency: account ? account.currency : prev.currency,
      };
    });
  }

  function changeMode(mode: FormMode) {
    setForm((prev) => {
      if (mode === prev.mode) return prev;
      if (mode === "profit" && prev.pnl === "" && prev.proceeds !== "") {
        const pnl =
          Number(prev.proceeds || 0) -
          Number(prev.fee || 0) -
          Number(prev.costBasis || 0);
        return { ...prev, mode, pnl: String(pnl) };
      }
      if (mode === "detail" && prev.proceeds === "" && prev.pnl !== "") {
        const proceeds =
          Number(prev.costBasis || 0) +
          Number(prev.pnl || 0) +
          Number(prev.fee || 0);
        return { ...prev, mode, proceeds: String(proceeds) };
      }
      return { ...prev, mode };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.name.trim()) {
      setError("请填写名称");
      return;
    }
    if (form.costBasis !== "" && !(Number(form.costBasis) >= 0)) {
      setError("成本不能为负");
      return;
    }
    if (form.mode === "profit") {
      if (form.pnl === "" || !Number.isFinite(Number(form.pnl))) {
        setError("请填写已实现收益");
        return;
      }
    } else if (form.proceeds === "" || !(Number(form.proceeds) >= 0)) {
      setError("请填写卖出金额");
      return;
    }

    setBusy(true);
    try {
      const isProfit = form.mode === "profit";
      const payload = {
        accountId: Number(form.accountId),
        categoryId: form.categoryId === "" ? null : Number(form.categoryId),
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        assetType: form.assetType,
        currency: form.currency,
        sellDate: form.sellDate,
        quantity: isProfit ? 0 : Number(form.quantity || 0),
        costBasis: Number(form.costBasis || 0),
        proceeds: isProfit ? 0 : Number(form.proceeds || 0),
        pnl: isProfit ? Number(form.pnl) : null,
        fee: isProfit ? 0 : Number(form.fee || 0),
        note: form.note.trim(),
      };
      const res = await fetch(
        form.id ? `/api/realized/${form.id}` : "/api/realized",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setMessage(form.id ? "补录记录已更新" : "已补录一笔收益");
      setForm(emptyForm(accounts, today));
      setYear(form.sellDate.slice(0, 4));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(trade: RealizedTrade) {
    const linked = trade.holdingId !== null;
    const confirmed = window.confirm(
      linked
        ? `撤销卖出「${trade.name}」会恢复持仓并扣回回款现金，确定继续？`
        : `确认删除「${trade.name}」这条补录记录？`,
    );
    if (!confirmed) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/realized/${trade.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "操作失败");
      setMessage(linked ? "已撤销卖出并恢复持仓" : "记录已删除");
      if (form.id === trade.id) {
        setForm(emptyForm(accounts, today));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  function edit(trade: RealizedTrade) {
    setForm(fromTrade(trade));
    setMessage(null);
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>查看年份</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item} 年
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() =>
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="rounded-lg border border-accent/40 bg-accent/15 px-3.5 py-2 text-xs font-medium text-accent transition hover:bg-accent/25"
        >
          + 补录已清仓
        </button>
      </div>

      <div className="rounded-xl border border-border/70 bg-panel-2/50 px-4 py-3 text-xs leading-relaxed text-muted">
        今年收益率只统计已卖出部分：已实现收益 ÷ 已实现成本，不含当前持仓浮动。未填成本的补录记录只计入收益金额，不参与收益率计算。当前浮动盈亏在下方单独展示。
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label={`${year} 已实现收益`}
          value={formatMoney(yearSummary.pnl, baseCurrency, 0)}
          tone={toneClass(yearSummary.pnl)}
          sub={
            <>
              <span className={toneClass(yearSummary.rate)}>
                {formatPct(yearSummary.rate)}
              </span>{" "}
              · 卖出 {yearSummary.count} 笔
            </>
          }
        />
        <SummaryCard
          label={`${year} 已实现成本`}
          value={formatMoney(yearSummary.cost, baseCurrency, 0)}
          sub="已卖出部分的成本合计"
        />
        <SummaryCard
          label="累计已实现收益"
          value={formatMoney(allSummary.pnl, baseCurrency, 0)}
          tone={toneClass(allSummary.pnl)}
          sub={
            <>
              <span className={toneClass(allSummary.rate)}>
                {formatPct(allSummary.rate)}
              </span>{" "}
              · 共 {allSummary.count} 笔
            </>
          }
        />
        <SummaryCard
          label="当前浮动盈亏"
          value={formatMoney(currentFloating, baseCurrency, 0)}
          tone={toneClass(currentFloating)}
          sub="不计入今年已实现收益率"
        />
        <SummaryCard
          label="累计收益（已实现 + 浮动）"
          value={formatMoney(allSummary.pnl + currentFloating, baseCurrency, 0)}
          tone={toneClass(allSummary.pnl + currentFloating)}
          sub="仅金额，不合并收益率"
        />
      </div>

      <form
        ref={formRef}
        onSubmit={submit}
        className="rounded-2xl border border-border/80 bg-panel/70 p-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {form.id ? "编辑补录记录" : "补录已清仓"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {form.mode === "profit"
                ? "直接填写已实现收益；成本可选，仅用于计算收益率。不影响当前持仓和现金。"
                : "按卖出金额与成本补录；不影响当前持仓和现金，金额按原币填写。"}
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm(emptyForm(accounts, today))}
              className="text-xs text-muted hover:text-ink"
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="mb-4 inline-flex rounded-lg border border-border bg-panel-2 p-0.5">
          {(
            [
              { key: "detail", label: "按买卖金额" },
              { key: "profit", label: "直接填收益" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeMode(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                form.mode === tab.key
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className={labelClass}>名称</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="如：宁德时代"
              required
            />
          </div>
          <div>
            <label className={labelClass}>账户</label>
            <select
              value={form.accountId}
              onChange={(e) => changeAccount(e.target.value)}
              className={inputClass}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>分类</label>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>币种</label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className={inputClass}
            >
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>资产类型</label>
            <select
              value={form.assetType}
              onChange={(e) => set("assetType", e.target.value as AssetType)}
              className={inputClass}
            >
              {ASSET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>卖出日期</label>
            <input
              type="date"
              value={form.sellDate}
              onChange={(e) => set("sellDate", e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>代码（可选）</label>
            <input
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              className={inputClass}
              placeholder="如 300750"
            />
          </div>
          {form.mode === "detail" ? (
            <>
              <div>
                <label className={labelClass}>数量（可选）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>买入成本（原币）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.costBasis}
                  onChange={(e) => set("costBasis", e.target.value)}
                  className={inputClass}
                  placeholder="如 10000"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>卖出金额（原币）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.proceeds}
                  onChange={(e) => set("proceeds", e.target.value)}
                  className={inputClass}
                  placeholder="如 12000"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>手续费（原币）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.fee}
                  onChange={(e) => set("fee", e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>已实现收益（原币）</label>
                <input
                  type="number"
                  step="any"
                  value={form.pnl}
                  onChange={(e) => set("pnl", e.target.value)}
                  className={inputClass}
                  placeholder="如 2500，亏损填负数"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>成本（可选，用于收益率）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.costBasis}
                  onChange={(e) => set("costBasis", e.target.value)}
                  className={inputClass}
                  placeholder="不填则收益率显示 —"
                />
              </div>
            </>
          )}
          <div className="md:col-span-2 xl:col-span-2">
            <label className={labelClass}>备注</label>
            <input
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className={inputClass}
              placeholder="可选"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || accounts.length === 0}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
          >
            {busy ? "保存中…" : form.id ? "保存修改" : "补录收益"}
          </button>
          {accounts.length === 0 ? (
            <span className="text-xs text-gold">请先创建账户。</span>
          ) : null}
          {message ? <span className="text-xs text-loss">{message}</span> : null}
          {error ? <span className="text-xs text-gain">{error}</span> : null}
        </div>
      </form>

      <Card>
        <CardHeader
          title={`${year} 卖出记录`}
          subtitle="补录记录可编辑；卖出产生的记录可撤销并恢复持仓"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-medium">标的</th>
                <th className="px-3 py-3 font-medium">账户</th>
                <th className="px-3 py-3 font-medium">分类</th>
                <th className="px-3 py-3 font-medium">卖出日期</th>
                <th className="px-3 py-3 text-right font-medium">数量</th>
                <th className="px-3 py-3 text-right font-medium">成本</th>
                <th className="px-3 py-3 text-right font-medium">卖出金额</th>
                <th className="px-3 py-3 text-right font-medium">费用</th>
                <th className="px-3 py-3 text-right font-medium">已实现收益</th>
                <th className="px-3 py-3 text-right font-medium">收益率</th>
                <th className="px-5 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-sm text-muted">
                    今年还没有卖出记录，可以补录已清仓的收益。
                  </td>
                </tr>
              ) : (
                filtered.map((trade) => {
                  const pnl = realizedPnl(trade);
                  const rate = trade.costBasis > 0 ? pnl / trade.costBasis : null;
                  const basePnl = pnl * (fx(trade.currency, baseCurrency) ?? 1);
                  const linked = trade.holdingId !== null;
                  const direct = trade.pnl !== null;
                  return (
                    <tr
                      key={trade.id}
                      className="border-t border-border/50 hover:bg-panel-2/50"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{trade.name}</span>
                          {trade.symbol ? (
                            <span className="num rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">
                              {trade.symbol.toUpperCase()}
                            </span>
                          ) : null}
                          <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">
                            {direct ? "直接收益" : linked ? "卖出" : "补录"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted">
                          {ASSET_TYPE_OPTIONS.find((o) => o.value === trade.assetType)
                            ?.label ?? trade.assetType}
                          {trade.cashCredited ? " · 回款已入现金" : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {accountNames.get(trade.accountId) ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {trade.categoryId === null
                          ? "未分类"
                          : (categoryNames.get(trade.categoryId) ?? "未分类")}
                      </td>
                      <td className="num px-3 py-3 text-xs">{trade.sellDate}</td>
                      <td className="num px-3 py-3 text-right text-xs text-muted">
                        {trade.quantity > 0 ? formatNumber(trade.quantity, 2) : "—"}
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-muted">
                        {direct && trade.costBasis === 0
                          ? "—"
                          : formatMoney(trade.costBasis, trade.currency, 2)}
                      </td>
                      <td className="num px-3 py-3 text-right text-xs">
                        {direct ? "—" : formatMoney(trade.proceeds, trade.currency, 2)}
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-muted">
                        {direct ? "—" : formatMoney(trade.fee, trade.currency, 2)}
                      </td>
                      <td className={`num px-3 py-3 text-right text-xs ${toneClass(pnl)}`}>
                        <div>{formatMoney(pnl, trade.currency, 2)}</div>
                        <div className="text-[10px] opacity-80">
                          {formatMoney(basePnl, baseCurrency, 0)}
                        </div>
                      </td>
                      <td className={`num px-3 py-3 text-right text-xs ${toneClass(rate)}`}>
                        {formatPct(rate)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        {trade.holdingId === null ? (
                          <>
                            <button
                              onClick={() => edit(trade)}
                              className="text-accent hover:underline"
                            >
                              编辑
                            </button>
                            <span className="mx-2 text-border">|</span>
                            <button
                              onClick={() => void remove(trade)}
                              className="text-gain hover:underline"
                            >
                              删除
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => void remove(trade)}
                            className="text-gold hover:underline"
                          >
                            撤销卖出
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
