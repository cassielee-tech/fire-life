"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_TYPE_OPTIONS, CATEGORY_COLORS, CURRENCY_OPTIONS, GOLD_SYMBOL_OPTIONS, MARKET_OPTIONS, formatMoney, formatNumber, formatPct, toneClass } from "@/lib/format";
import { toCostBasis, toCostPrice } from "@/lib/cost";
import { SellDialog } from "@/components/sell-dialog";
import type { AssetType, Market } from "@/lib/valuation";

export type ManagerRow = {
  id: number;
  accountId: number;
  categoryId: number | null;
  name: string;
  symbol: string;
  assetType: AssetType;
  market: Market;
  currency: string;
  quantity: number;
  price: number | null;
  costBasis: number;
  costPrice: number | null;
  manualValue: number | null;
  manualPrice: number | null;
  marketValue: number;
  pnl: number;
  pnlPct: number | null;
  priceSource: string;
  priceDate: string | null;
  stale: boolean;
};

type AccountOption = { id: number; name: string; currency: string };
type CategoryOption = { id: number; name: string; color: string };

type FormState = {
  id: number | null;
  accountId: string;
  categoryId: string;
  name: string;
  symbol: string;
  assetType: AssetType;
  market: Market;
  currency: string;
  quantity: string;
  costBasis: string;
  costPrice: string;
  manualValue: string;
  manualPrice: string;
};

const SHARES_TYPES: AssetType[] = ["stock", "fund", "wealth", "gold"];
const MARKET_TYPES: AssetType[] = ["stock", "fund"];
const MANUAL_VALUE_TYPES: AssetType[] = ["cash", "deposit", "other"];

function usesAccountCurrency(assetType: AssetType) {
  return !MARKET_TYPES.includes(assetType) && assetType !== "gold";
}

type AccountKind = "bank" | "broker" | "cash" | "other";

const ACCOUNT_KIND_OPTIONS: Array<{ value: AccountKind; label: string }> = [
  { value: "bank", label: "银行" },
  { value: "broker", label: "券商" },
  { value: "cash", label: "现金钱包" },
  { value: "other", label: "其他" },
];

function emptyForm(accounts: AccountOption[]): FormState {
  return {
    id: null,
    accountId: accounts[0] ? String(accounts[0].id) : "",
    categoryId: "",
    name: "",
    symbol: "",
    assetType: "cash",
    market: "NONE",
    currency: accounts[0]?.currency ?? "CNY",
    quantity: "1",
    costBasis: "",
    costPrice: "",
    manualValue: "",
    manualPrice: "",
  };
}

function toForm(row: ManagerRow): FormState {
  const derivedCostPrice = toCostPrice(row.costBasis, row.quantity);
  const netValueRaw =
    row.manualPrice !== null
      ? row.manualPrice
      : row.manualValue !== null && row.quantity > 0
        ? row.manualValue / row.quantity
        : null;
  const netValue =
    netValueRaw === null ? "" : String(Number(netValueRaw.toFixed(6)));

  return {
    id: row.id,
    accountId: String(row.accountId),
    categoryId: row.categoryId === null ? "" : String(row.categoryId),
    name: row.name,
    symbol: row.symbol.toUpperCase(),
    assetType: row.assetType,
    market: row.market,
    currency: row.currency,
    quantity: String(row.quantity),
    costBasis: String(row.costBasis),
    costPrice:
      derivedCostPrice === null
        ? ""
        : String(Number(derivedCostPrice.toFixed(6))),
    manualValue: row.manualValue === null ? "" : String(row.manualValue),
    manualPrice:
      row.assetType === "wealth"
        ? netValue
        : row.manualPrice === null
          ? ""
          : String(row.manualPrice),
  };
}

const inputClass =
  "w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent/60";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wider text-muted";

export function HoldingsManager({
  rows,
  accounts,
  categories,
  currency,
}: {
  rows: ManagerRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
}) {
  const router = useRouter();
  const [accountList, setAccountList] = useState<AccountOption[]>(accounts);
  const [categoryList, setCategoryList] =
    useState<CategoryOption[]>(categories);
  const [form, setForm] = useState<FormState>(() => emptyForm(accounts));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showNewAccount, setShowNewAccount] = useState(accounts.length === 0);
  const [newAccount, setNewAccount] = useState<{
    name: string;
    kind: AccountKind;
    currency: string;
  }>({ name: "", kind: "bank", currency: accounts[0]?.currency ?? "CNY" });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<ManagerRow | null>(null);

  const isMarketAsset = MARKET_TYPES.includes(form.assetType);
  const isSharesAsset = SHARES_TYPES.includes(form.assetType);
  const isManualValueAsset = MANUAL_VALUE_TYPES.includes(form.assetType);
  const isWealth = form.assetType === "wealth";
  const isGold = form.assetType === "gold";

  const computedCostBasis = toCostBasis(
    Number(form.quantity || 0),
    Number(form.costPrice || 0),
  );
  const computedMarketValue = toCostBasis(
    Number(form.quantity || 0),
    Number(form.manualPrice || 0),
  );

  const accountName = useMemo(
    () => new Map(accountList.map((a) => [a.id, a.name])),
    [accountList],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm((prev) => {
      const next = emptyForm(accountList);
      return {
        ...next,
        accountId: prev.accountId || next.accountId,
        categoryId: prev.categoryId || next.categoryId,
        currency: prev.currency || next.currency,
      };
    });
  }

  async function createInlineAccount() {
    const name = newAccount.name.trim();
    if (!name) {
      setAccountError("请输入账户名称");
      return;
    }
    if (accountList.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setAccountError("账户名称已存在");
      return;
    }

    setAccountBusy(true);
    setAccountError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kind: newAccount.kind,
          currency: newAccount.currency,
        }),
      });
      const data = (await res.json()) as {
        id?: number;
        name?: string;
        currency?: string;
        error?: string;
      };
      if (!res.ok || !data.id) throw new Error(data.error ?? "创建账户失败");

      const created: AccountOption = {
        id: data.id,
        name: data.name ?? name,
        currency: data.currency ?? newAccount.currency,
      };
      setAccountList((prev) => [...prev, created]);
      setForm((prev) => ({
        ...prev,
        accountId: String(created.id),
        currency: usesAccountCurrency(prev.assetType)
          ? created.currency
          : prev.currency,
      }));
      setNewAccount({ name: "", kind: "bank", currency: created.currency });
      setShowNewAccount(false);
      setMessage(`账户「${created.name}」已创建并选中`);
      router.refresh();
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "创建账户失败");
    } finally {
      setAccountBusy(false);
    }
  }

  async function createInlineCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("请输入分类名称");
      return;
    }
    if (categoryList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError("分类名称已存在");
      return;
    }

    setCategoryBusy(true);
    setCategoryError(null);
    try {
      const color =
        CATEGORY_COLORS[categoryList.length % CATEGORY_COLORS.length];
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      const data = (await res.json()) as {
        id?: number;
        name?: string;
        color?: string;
        error?: string;
      };
      if (!res.ok || !data.id) throw new Error(data.error ?? "创建分类失败");

      const created: CategoryOption = {
        id: data.id,
        name: data.name ?? name,
        color: data.color ?? color,
      };
      setCategoryList((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, categoryId: String(created.id) }));
      setNewCategoryName("");
      setShowNewCategory(false);
      setMessage(`分类「${created.name}」已创建并选中`);
      router.refresh();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "创建分类失败");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function updateRowCategory(holdingId: number, value: string) {
    setError(null);
    try {
      const res = await fetch(`/api/holdings/${holdingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: value === "" ? null : Number(value),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "更新分类失败");
      }
      setMessage("分类已更新");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新分类失败");
    }
  }

  function changeAssetType(assetType: AssetType) {
    setForm((prev) => {
      if (assetType === "gold") {
        return {
          ...prev,
          assetType,
          market: "GOLD",
          symbol: "AU9999",
          currency: "CNY",
          manualValue: "",
          manualPrice: "",
        };
      }

      const isMarket = MARKET_TYPES.includes(assetType);
      let market: Market = prev.market;
      if (!isMarket) market = "NONE";
      else if (assetType === "fund") market = "FUND";
      else if (prev.market === "NONE" || prev.market === "FUND") market = "CN";

      let currency = prev.currency;
      if (market === "CN" || market === "FUND") currency = "CNY";
      else if (market === "HK") currency = "HKD";
      else if (market === "US") currency = "USD";
      else {
        const account = accountList.find((a) => String(a.id) === prev.accountId);
        if (account) currency = account.currency;
      }

      return {
        ...prev,
        assetType,
        market,
        currency,
        symbol: isMarket ? prev.symbol : "",
        manualValue: "",
        manualPrice: "",
      };
    });
  }

  function changeMarket(market: Market) {
    setForm((prev) => {
      let currency = prev.currency;
      if (market === "CN" || market === "FUND") currency = "CNY";
      if (market === "HK") currency = "HKD";
      if (market === "US") currency = "USD";
      return { ...prev, market, currency };
    });
  }

  function changeAccount(accountId: string) {
    setForm((prev) => {
      const account = accountList.find((a) => String(a.id) === accountId);
      return {
        ...prev,
        accountId,
        currency:
          usesAccountCurrency(prev.assetType) && account
            ? account.currency
            : prev.currency,
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const quantity = isSharesAsset ? Number(form.quantity || 0) : 1;
    const costPrice = Number(form.costPrice || 0);
    if (isSharesAsset) {
      if (!(quantity > 0)) {
        setError("份额需大于 0");
        return;
      }
      if (form.costPrice === "" || !(costPrice >= 0)) {
        setError("请填写成本价");
        return;
      }
      if (isWealth && form.manualPrice === "") {
        setError("请填写当前净值");
        return;
      }
    }

    if (form.id !== null && isSharesAsset) {
      const original = rows.find((row) => row.id === form.id);
      if (original && quantity < original.quantity - 1e-9) {
        const confirmed = window.confirm(
          "直接减少持仓数量不会生成已实现收益记录。建议使用「卖出」操作。仍要继续吗？",
        );
        if (!confirmed) return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        accountId: Number(form.accountId),
        categoryId: form.categoryId === "" ? null : Number(form.categoryId),
        name: form.name.trim(),
        symbol: isGold
          ? form.symbol || "AU9999"
          : isMarketAsset
            ? form.symbol.trim()
            : "",
        assetType: form.assetType,
        market: isGold ? "GOLD" : isMarketAsset ? form.market : "NONE",
        currency: isGold ? "CNY" : form.currency,
        quantity,
        costBasis: isSharesAsset
          ? toCostBasis(quantity, costPrice)
          : Number(form.costBasis || 0),
        manualValue:
          isManualValueAsset && form.manualValue !== ""
            ? Number(form.manualValue)
            : null,
        manualPrice:
          isSharesAsset && form.manualPrice !== ""
            ? Number(form.manualPrice)
            : null,
      };
      const res = await fetch(form.id ? `/api/holdings/${form.id}` : "/api/holdings", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setMessage(form.id ? "持仓已更新" : "持仓已添加");
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!window.confirm(`确认删除「${name}」？该持仓的历史快照也会一并删除。`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/holdings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "删除失败");
      }
      setMessage("持仓已删除");
      if (form.id === id) resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-border/80 bg-panel/70 p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {form.id ? "编辑持仓" : "新增持仓"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              股票/基金/理财/黄金填数量与成本价，总成本自动计算；理财填当前净值，黄金填克数并自动同步上海金价，现金类填市值与总成本。
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-muted hover:text-ink"
            >
              取消编辑
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                所属账户
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowNewAccount((prev) => !prev);
                  setAccountError(null);
                }}
                className="text-[11px] text-accent transition hover:underline"
              >
                {showNewAccount ? "收起" : "+ 新建账户"}
              </button>
            </div>
            <select
              value={form.accountId}
              onChange={(e) => changeAccount(e.target.value)}
              className={inputClass}
              required
            >
              {accountList.length === 0 ? (
                <option value="">请先新建账户</option>
              ) : null}
              {accountList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                自定义分类
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory((prev) => !prev);
                  setCategoryError(null);
                }}
                className="text-[11px] text-accent transition hover:underline"
              >
                {showNewCategory ? "收起" : "+ 新建分类"}
              </button>
            </div>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={inputClass}
            >
              <option value="">未分类</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>名称</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="如：沪深300ETF"
              required
            />
          </div>

          <div>
            <label className={labelClass}>资产类型</label>
            <select
              value={form.assetType}
              onChange={(e) => changeAssetType(e.target.value as AssetType)}
              className={inputClass}
            >
              {ASSET_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              币种{isGold ? "（固定 CNY）" : ""}
            </label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={isGold}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {showNewAccount ? (
            <div
              className="col-span-full rounded-xl border border-accent/25 bg-accent/5 p-3"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                  e.preventDefault();
                  void createInlineAccount();
                }
                if (e.key === "Escape") setShowNewAccount(false);
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink">新建账户</span>
                <span className="text-[10px] text-muted">创建后自动选中，无需跳转</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  autoFocus
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="账户名称，如：中银香港"
                />
                <select
                  value={newAccount.kind}
                  onChange={(e) =>
                    setNewAccount((prev) => ({
                      ...prev,
                      kind: e.target.value as AccountKind,
                    }))
                  }
                  className={inputClass}
                >
                  {ACCOUNT_KIND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newAccount.currency}
                  onChange={(e) =>
                    setNewAccount((prev) => ({ ...prev, currency: e.target.value }))
                  }
                  className={inputClass}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void createInlineAccount()}
                  disabled={accountBusy}
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
                >
                  {accountBusy ? "创建中…" : "创建并使用"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewAccount(false);
                    setAccountError(null);
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted transition hover:text-ink"
                >
                  取消
                </button>
                {accountError ? (
                  <span className="text-xs text-gain">{accountError}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {showNewCategory ? (
            <div
              className="col-span-full rounded-xl border border-accent/25 bg-accent/5 p-3"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
                  e.preventDefault();
                  void createInlineCategory();
                }
                if (e.key === "Escape") setShowNewCategory(false);
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink">新建分类</span>
                <span className="text-[10px] text-muted">
                  创建后自动选中，可在「分类」页修改颜色
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={`${inputClass} max-w-xs`}
                  placeholder="分类名称，如：核心资产"
                />
                <button
                  type="button"
                  onClick={() => void createInlineCategory()}
                  disabled={categoryBusy}
                  className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:opacity-50"
                >
                  {categoryBusy ? "创建中…" : "创建并使用"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setCategoryError(null);
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted transition hover:text-ink"
                >
                  取消
                </button>
                {categoryError ? (
                  <span className="text-xs text-gain">{categoryError}</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {isMarketAsset ? (
            <>
              <div>
                <label className={labelClass}>市场</label>
                <select
                  value={form.market}
                  onChange={(e) => changeMarket(e.target.value as Market)}
                  className={inputClass}
                >
                  {form.assetType === "fund"
                    ? MARKET_OPTIONS.filter((o) => o.value === "FUND").map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))
                    : MARKET_OPTIONS.filter((o) =>
                        ["CN", "HK", "US"].includes(o.value),
                      ).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>代码</label>
                <input
                  value={form.symbol}
                  onChange={(e) => set("symbol", e.target.value)}
                  className={inputClass}
                  required
                  placeholder={form.assetType === "fund" ? "如 000001" : "如 600519 / AAPL / 00700"}
                />
              </div>
            </>
          ) : null}

          {isGold ? (
            <div>
              <label className={labelClass}>行情标的</label>
              <select
                value={form.symbol || "AU9999"}
                onChange={(e) => set("symbol", e.target.value)}
                className={inputClass}
              >
                {GOLD_SYMBOL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {isSharesAsset ? (
            <>
              <div>
                <label className={labelClass}>
                  {isGold ? "克数" : "份额 / 数量"}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      quantity: value,
                      costBasis: String(
                        toCostBasis(
                          Number(value || 0),
                          Number(prev.costPrice || 0),
                        ),
                      ),
                    }));
                  }}
                  className={inputClass}
                  placeholder={isGold ? "如 100" : "如 20000"}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  {isGold ? "成本价（元/克）" : "成本价（原币）"}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      costPrice: value,
                      costBasis: String(
                        toCostBasis(
                          Number(prev.quantity || 0),
                          Number(value || 0),
                        ),
                      ),
                    }));
                  }}
                  className={inputClass}
                  placeholder={isGold ? "如 500" : "如 3.6"}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>总成本（自动）</label>
                <input
                  readOnly
                  value={formatMoney(computedCostBasis, form.currency, 2)}
                  className={`${inputClass} cursor-not-allowed text-muted`}
                  tabIndex={-1}
                />
              </div>

              {isWealth ? (
                <>
                  <div>
                    <label className={labelClass}>当前净值</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={form.manualPrice}
                      onChange={(e) => set("manualPrice", e.target.value)}
                      className={inputClass}
                      placeholder="如 1.532"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>当前市值（自动）</label>
                    <input
                      readOnly
                      value={formatMoney(computedMarketValue, form.currency, 2)}
                      className={`${inputClass} cursor-not-allowed text-muted`}
                      tabIndex={-1}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelClass}>
                    {isGold ? "当前金价（可选）" : "手动价（可选）"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.manualPrice}
                    onChange={(e) => set("manualPrice", e.target.value)}
                    className={inputClass}
                    placeholder={isGold ? "留空自动同步上海金" : "留空则使用行情"}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>当前市值（原币）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.manualValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      manualValue: value,
                      costBasis: prev.costBasis === "" ? value : prev.costBasis,
                    }));
                  }}
                  className={inputClass}
                  placeholder="如 80000"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>总成本（原币）</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.costBasis}
                  onChange={(e) => set("costBasis", e.target.value)}
                  className={inputClass}
                  placeholder="如本金 75000"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || accountList.length === 0 || !form.accountId}
            className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "保存中…" : form.id ? "保存修改" : "添加持仓"}
          </button>
          {accountList.length === 0 ? (
            <span className="text-xs text-gold">
              还没有账户，点击「+ 新建账户」即可边创建边录入持仓。
            </span>
          ) : null}
          {message ? <span className="text-xs text-loss">{message}</span> : null}
          {error ? <span className="text-xs text-gain">{error}</span> : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-panel/70">
        <table className="w-full min-w-[1140px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-5 py-3 font-medium">持仓</th>
              <th className="px-3 py-3 font-medium">账户</th>
              <th className="px-3 py-3 font-medium">分类</th>
              <th className="px-3 py-3 font-medium">类型</th>
              <th className="px-3 py-3 text-right font-medium">数量</th>
              <th className="px-3 py-3 text-right font-medium">成本</th>
              <th className="px-3 py-3 text-right font-medium">市值</th>
              <th className="px-3 py-3 text-right font-medium">盈亏</th>
              <th className="px-3 py-3 font-medium">价格</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-12 text-center text-sm text-muted">
                  还没有持仓，使用上方表单添加。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50 hover:bg-panel-2/50">
                  <td className="px-5 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-[11px] text-muted">
                      {row.symbol ? row.symbol.toUpperCase() : "—"} · {row.currency}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {accountName.get(row.accountId) ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.categoryId === null ? "" : String(row.categoryId)}
                      onChange={(e) => void updateRowCategory(row.id, e.target.value)}
                      className="rounded-md border border-border bg-panel-2 px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
                    >
                      <option value="">未分类</option>
                      {categoryList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {ASSET_TYPE_OPTIONS.find((o) => o.value === row.assetType)?.label}
                    <div className="text-[10px] text-muted">
                      {MARKET_OPTIONS.find((o) => o.value === row.market)?.label}
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right text-xs">
                    {MANUAL_VALUE_TYPES.includes(row.assetType)
                      ? "—"
                      : formatNumber(row.quantity, row.quantity % 1 === 0 ? 0 : 2)}
                  </td>
                  <td className="num px-3 py-3 text-right text-xs text-muted">
                    <div>{formatNumber(row.costBasis, 2)}</div>
                    {SHARES_TYPES.includes(row.assetType) && row.costPrice !== null ? (
                      <div className="text-[10px]">
                        成本价{" "}
                        {formatNumber(row.costPrice, row.costPrice < 10 ? 4 : 2)}
                      </div>
                    ) : null}
                  </td>
                  <td className="num px-3 py-3 text-right">
                    {formatMoney(row.marketValue, currency, 0)}
                  </td>
                  <td className={`num px-3 py-3 text-right text-xs ${toneClass(row.pnl)}`}>
                    <div>{formatMoney(row.pnl, currency, 0)}</div>
                    <div className="text-[10px] opacity-80">{formatPct(row.pnlPct)}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    {row.assetType === "wealth" ? (
                      `净值 ${
                        row.manualPrice === null
                          ? "—"
                          : formatNumber(row.manualPrice, 4)
                      }`
                    ) : row.assetType === "gold" ? (
                      row.priceSource === "manual" ? (
                        "手动金价"
                      ) : row.priceSource === "missing" ? (
                        "缺价"
                      ) : (
                        `金价 ${row.priceDate ?? ""}`
                      )
                    ) : row.priceSource === "manual-value" ? (
                      "手动市值"
                    ) : row.priceSource === "manual" ? (
                      "手动价"
                    ) : row.priceSource === "missing" ? (
                      "缺价"
                    ) : (
                      `行情 ${row.priceDate ?? ""}`
                    )}
                    {row.stale ? <span className="ml-1 text-gold">滞后</span> : null}
                  </td>
                  <td className="px-5 py-3 text-right text-xs">
                    {["stock", "fund", "wealth", "gold"].includes(row.assetType) && row.quantity > 0 ? (
                      <>
                        <button
                          onClick={() => setSellTarget(row)}
                          className="text-gold hover:underline"
                        >
                          卖出
                        </button>
                        <span className="mx-2 text-border">|</span>
                      </>
                    ) : null}
                    <button
                      onClick={() => {
                        setForm(toForm(row));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-accent hover:underline"
                    >
                      编辑
                    </button>
                    <span className="mx-2 text-border">|</span>
                    <button
                      onClick={() => void remove(row.id, row.name)}
                      className="text-gain hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sellTarget ? (
        <SellDialog
          target={sellTarget}
          onClose={() => setSellTarget(null)}
          onDone={(msg) => {
            setSellTarget(null);
            setMessage(msg);
          }}
        />
      ) : null}
    </div>
  );
}
