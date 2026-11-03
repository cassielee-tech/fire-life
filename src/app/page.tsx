import Link from "next/link";
import { AllocationPanel, TrendChart } from "@/components/charts";
import { DashboardFilters } from "@/components/dashboard-filters";
import { HoldingsTable } from "@/components/holdings-table";
import { SyncButton } from "@/components/sync-button";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import {
  getHistory,
  getPortfolio,
  getSetting,
  latestFxPairs,
  listRealizedTrades,
} from "@/db/queries";
import { formatMoney, formatPct, toneClass } from "@/lib/format";
import { allocate, allocateByCategory } from "@/lib/valuation";
import { summarizeRealizedFromPairs } from "@/lib/returns";

export const dynamic = "force-dynamic";

function Stat({
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
    <Card className="p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`num mt-2 text-2xl font-semibold tracking-tight ${tone ?? "text-ink"}`}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-xs text-muted">{sub}</div> : null}
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string; category?: string }>;
}) {
  const params = await searchParams;
  const allPortfolio = getPortfolio();
  const accountParam = params.account;
  const parsedAccountId = accountParam ? Number(accountParam) : NaN;
  const activeAccount = Number.isInteger(parsedAccountId)
    ? allPortfolio.accounts.find((account) => account.id === parsedAccountId)
    : undefined;
  const activeAccountId = activeAccount?.id;

  let categoryFilter: number | null | undefined = undefined;
  if (params.category === "none") {
    categoryFilter = null;
  } else if (params.category) {
    const parsedCategoryId = Number(params.category);
    if (
      Number.isInteger(parsedCategoryId) &&
      allPortfolio.categories.some(
        (category) => category.id === parsedCategoryId,
      )
    ) {
      categoryFilter = parsedCategoryId;
    }
  }
  const activeCategory =
    categoryFilter !== null && categoryFilter !== undefined
      ? allPortfolio.categories.find(
          (category) => category.id === categoryFilter,
        )
      : undefined;
  const categoryLabel =
    categoryFilter === null ? "未分类" : activeCategory?.name;
  const hasFilter =
    activeAccount !== undefined || categoryFilter !== undefined;

  const portfolio = hasFilter
    ? getPortfolio(
        allPortfolio.baseCurrency,
        allPortfolio.today,
        activeAccountId,
        categoryFilter,
      )
    : allPortfolio;
  const distributionPortfolio =
    categoryFilter !== undefined
      ? getPortfolio(
          allPortfolio.baseCurrency,
          allPortfolio.today,
          undefined,
          categoryFilter,
        )
      : allPortfolio;

  const history = getHistory(activeAccountId, categoryFilter);
  const accountNames = new Map(
    allPortfolio.accounts.map((account) => [account.id, account.name]),
  );
  const { summary, valuations, baseCurrency } = portfolio;

  const byAsset = allocate(valuations, "assetType", accountNames);
  const byCurrency = allocate(valuations, "currency", accountNames);
  const byCategory = allocateByCategory(valuations, allPortfolio.categories);

  const accountNameById: Record<number, string> = {};
  for (const account of allPortfolio.accounts) {
    accountNameById[account.id] = account.name;
  }
  const categoryNameById: Record<number, string> = {};
  for (const category of allPortfolio.categories) {
    categoryNameById[category.id] = category.name;
  }
  const lastSync = getSetting("last_sync");
  const today = portfolio.today;
  const hasData = valuations.length > 0;

  const realizedTrades = listRealizedTrades(activeAccountId, categoryFilter);
  const fxPairs = latestFxPairs();
  const currentYear = portfolio.today.slice(0, 4);
  const ytdRealized = summarizeRealizedFromPairs(
    realizedTrades,
    fxPairs,
    baseCurrency,
    currentYear,
  );

  const filterLabel =
    [activeAccount?.name, categoryLabel].filter(Boolean).join(" · ") ||
    "全部资产";
  const selectedCategory =
    categoryFilter === null ? "none" : categoryFilter ?? null;

  const totalLabel =
    activeAccount && categoryFilter === undefined
      ? "账户总资产"
      : categoryFilter !== undefined && !activeAccount
        ? "分类总资产"
        : hasFilter
          ? "筛选总资产"
          : "总资产";
  const allocationLabel =
    activeAccount && categoryFilter === undefined
      ? "账户资产"
      : categoryFilter !== undefined && !activeAccount
        ? "分类资产"
        : hasFilter
          ? "筛选资产"
          : "总资产";
  const weightLabel =
    activeAccount && categoryFilter !== undefined
      ? "筛选内"
      : activeAccount
        ? "账户内"
        : categoryFilter !== undefined
          ? "分类内"
          : "占比";

  const exportParams = new URLSearchParams();
  if (activeAccountId !== undefined) {
    exportParams.set("account", String(activeAccountId));
  }
  if (categoryFilter !== undefined) {
    exportParams.set(
      "category",
      categoryFilter === null ? "none" : String(categoryFilter),
    );
  }
  const exportHref = `/api/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  const accountHref = (accountId: number | null) => {
    const query = new URLSearchParams();
    if (accountId !== null) query.set("account", String(accountId));
    if (categoryFilter !== undefined) {
      query.set(
        "category",
        categoryFilter === null ? "none" : String(categoryFilter),
      );
    }
    return query.toString() ? `/?${query.toString()}` : "/";
  };

  const filterAccounts = allPortfolio.accounts.map((account) => ({
    id: account.id,
    name: account.name,
  }));
  const filterCategories = allPortfolio.categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="资产总览"
        description={`${today} · ${filterLabel} · 折算为 ${baseCurrency}`}
        actions={
          <>
            <DashboardFilters
              key={`${activeAccountId ?? "all"}:${selectedCategory ?? "all"}`}
              accounts={filterAccounts}
              categories={filterCategories}
              selectedAccountId={activeAccountId ?? null}
              selectedCategory={selectedCategory}
            />
            <SyncButton />
            <a
              href={exportHref}
              className="rounded-lg border border-border bg-panel-2 px-3.5 py-2 text-xs text-muted transition hover:text-ink"
            >
              导出 CSV
            </a>
          </>
        }
      />

      {summary.missingPriceCount > 0 || summary.missingFxCount > 0 ? (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-gold">
          {summary.missingPriceCount > 0
            ? `${summary.missingPriceCount} 笔持仓缺少行情，暂按成本估值。`
            : ""}
          {summary.missingFxCount > 0
            ? ` ${summary.missingFxCount} 笔持仓缺少汇率，暂按 1:1 折算。`
            : ""}
          {" "}
          <Link href="/sync" className="underline underline-offset-2">
            查看同步状态
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={totalLabel}
          value={formatMoney(summary.totalValue, baseCurrency, 0)}
          sub={
            hasData ? (
              <>
                {valuations.length} 笔持仓 · 成本{" "}
                {formatMoney(summary.totalCost, baseCurrency, 0)}
              </>
            ) : (
              "还没有任何持仓"
            )
          }
        />
        <Stat
          label="当日盈亏"
          value={formatMoney(summary.dayChange, baseCurrency, 0)}
          tone={toneClass(summary.dayChange)}
          sub={
            <span className={toneClass(summary.dayChangePct)}>
              {formatPct(summary.dayChangePct)} · 相对昨日
            </span>
          }
        />
        <Stat
          label="当前浮动盈亏"
          value={formatMoney(summary.totalPnl, baseCurrency, 0)}
          tone={toneClass(summary.totalPnl)}
          sub={
            <span className={toneClass(summary.totalPnlPct)}>
              {formatPct(summary.totalPnlPct)} · 成本法
            </span>
          }
        />
        <Stat
          label="今年已实现收益"
          value={formatMoney(ytdRealized.pnl, baseCurrency, 0)}
          tone={toneClass(ytdRealized.pnl)}
          sub={
            <span>
              <span className={toneClass(ytdRealized.rate)}>
                {formatPct(ytdRealized.rate)}
              </span>
              {" · "}
              {ytdRealized.count} 笔 ·{" "}
              <Link href="/returns" className="text-accent hover:underline">
                {hasFilter ? "全部明细" : "明细"} →
              </Link>
            </span>
          }
        />
        <Stat
          label="数据状态"
          value={
            summary.missingPriceCount > 0 || summary.missingFxCount > 0
              ? "待补数据"
              : summary.stalePriceCount > 0
                ? "部分价格滞后"
                : "正常"
          }
          tone={
            summary.missingPriceCount > 0 || summary.missingFxCount > 0
              ? "text-gold"
              : "text-ink"
          }
          sub={
            <span>
              上次同步：
              {lastSync
                ? new Date(lastSync).toLocaleString("zh-CN", { hour12: false })
                : "从未"}
            </span>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="资产配置"
            subtitle={
              hasFilter
                ? `${filterLabel} · 按资产类型或自定义分类`
                : "按资产类型或自定义分类"
            }
          />
          <AllocationPanel
            byAsset={byAsset}
            byCategory={byCategory}
            currency={baseCurrency}
            total={summary.totalValue}
            hasCategories={allPortfolio.categories.length > 0}
            totalLabel={allocationLabel}
          />
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="资产走势"
            subtitle={
              hasFilter
                ? `${filterLabel} · 最近 ${history.length} 个快照日`
                : `最近 ${history.length} 个快照日`
            }
            action={
              <Link href="/history" className="text-xs text-muted hover:text-ink">
                查看历史 →
              </Link>
            }
          />
          <TrendChart data={history} currency={baseCurrency} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="持仓明细"
          subtitle={
            hasFilter
              ? `${filterLabel} · 点击表头排序`
              : "点击表头排序 · 默认按市值"
          }
          action={
            <Link href="/holdings" className="text-xs text-muted hover:text-ink">
              管理持仓 →
            </Link>
          }
        />
        <HoldingsTable
          valuations={valuations}
          accountNames={accountNameById}
          categoryNames={categoryNameById}
          currency={baseCurrency}
          weightLabel={weightLabel}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="币种敞口" subtitle="折算后占比" />
          <div className="space-y-3 px-5 py-4">
            {byCurrency.length === 0 ? (
              <p className="text-xs text-muted">暂无数据</p>
            ) : (
              byCurrency.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{item.label}</span>
                    <span className="num">
                      {formatMoney(item.value, baseCurrency, 0)} ·{" "}
                      {(item.weight * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
                    <div
                      className="h-full rounded-full bg-accent/70"
                      style={{ width: `${Math.max(item.weight * 100, 1)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="账户分布"
            subtitle={
              categoryLabel
                ? `按账户汇总 · ${categoryLabel}`
                : "点击账户切换筛选"
            }
            action={
              activeAccount ? (
                <Link
                  href={accountHref(null)}
                  className="text-xs text-muted hover:text-ink"
                >
                  全部账户
                </Link>
              ) : undefined
            }
          />
          <div className="divide-y divide-border/50">
            {allPortfolio.accounts.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted">还没有账户。</p>
            ) : (
              allPortfolio.accounts.map((account) => {
                const value = distributionPortfolio.valuations
                  .filter((valuation) => valuation.accountId === account.id)
                  .reduce((sum, valuation) => sum + valuation.marketValue, 0);
                const selected = account.id === activeAccountId;
                return (
                  <Link
                    key={account.id}
                    href={accountHref(selected ? null : account.id)}
                    className={`flex items-center justify-between px-5 py-3 text-sm transition ${
                      selected ? "bg-accent/10" : "hover:bg-panel-2/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.name}</span>
                        {selected ? (
                          <span className="text-[10px] text-accent">当前</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted">
                        {account.institution || "—"} · {account.currency}
                      </div>
                    </div>
                    <div className="num text-sm">
                      {formatMoney(value, baseCurrency, 0)}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
