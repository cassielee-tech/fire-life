import Link from "next/link";
import { AllocationPanel, TrendChart } from "@/components/charts";
import { HoldingsTable } from "@/components/holdings-table";
import { SyncButton } from "@/components/sync-button";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import {
  getHistory,
  getPortfolio,
  getSetting,
  latestFxPairs,
  listRealizedTrades,
  localToday,
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

export default function DashboardPage() {
  const portfolio = getPortfolio();
  const history = getHistory();
  const accountNames = new Map(portfolio.accounts.map((a) => [a.id, a.name]));
  const { summary, valuations, baseCurrency } = portfolio;

  const byAsset = allocate(valuations, "assetType", accountNames);
  const byCurrency = allocate(valuations, "currency", accountNames);
  const byCategory = allocateByCategory(valuations, portfolio.categories);

  const accountNameById: Record<number, string> = {};
  for (const account of portfolio.accounts) {
    accountNameById[account.id] = account.name;
  }
  const categoryNameById: Record<number, string> = {};
  for (const category of portfolio.categories) {
    categoryNameById[category.id] = category.name;
  }
  const lastSync = getSetting("last_sync");
  const today = localToday();
  const hasData = valuations.length > 0;

  const realizedTrades = listRealizedTrades();
  const fxPairs = latestFxPairs();
  const currentYear = portfolio.today.slice(0, 4);
  const ytdRealized = summarizeRealizedFromPairs(
    realizedTrades,
    fxPairs,
    baseCurrency,
    currentYear,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="资产总览"
        description={`${today} · 所有资产折算为 ${baseCurrency}`}
        actions={
          <>
            <SyncButton />
            <a
              href="/api/export"
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
          label="总资产"
          value={formatMoney(summary.totalValue, baseCurrency, 0)}
          sub={
            hasData ? (
              <>
                {valuations.length} 笔持仓 · 成本 {formatMoney(summary.totalCost, baseCurrency, 0)}
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
                明细 →
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
              {lastSync ? new Date(lastSync).toLocaleString("zh-CN", { hour12: false }) : "从未"}
            </span>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="资产配置"
            subtitle="按资产类型或自定义分类"
          />
          <AllocationPanel
            byAsset={byAsset}
            byCategory={byCategory}
            currency={baseCurrency}
            total={summary.totalValue}
            hasCategories={portfolio.categories.length > 0}
          />
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="资产走势"
            subtitle={`最近 ${history.length} 个快照日`}
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
          subtitle="点击表头排序 · 默认按市值"
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
          <CardHeader title="账户分布" subtitle="按账户汇总" />
          <div className="divide-y divide-border/50">
            {portfolio.accounts.length === 0 ? (
              <p className="px-5 py-6 text-xs text-muted">还没有账户。</p>
            ) : (
              portfolio.accounts.map((account) => {
                const value = valuations
                  .filter((v) => v.accountId === account.id)
                  .reduce((s, v) => s + v.marketValue, 0);
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-[11px] text-muted">
                        {account.institution || "—"} · {account.currency}
                      </div>
                    </div>
                    <div className="num text-sm">{formatMoney(value, baseCurrency, 0)}</div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
