import Link from "next/link";
import { SyncButton } from "@/components/sync-button";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { getBaseCurrency, getSetting, latestFxRows, latestPriceRows, localToday } from "@/db/queries";
import { formatNumber } from "@/lib/format";
import { MARKET_LABELS, type Market } from "@/lib/valuation";
import type { SyncReport } from "@/lib/sync";

export const dynamic = "force-dynamic";

function parseReport(raw: string | undefined): SyncReport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncReport;
  } catch {
    return null;
  }
}

export default function SyncPage() {
  const lastSync = getSetting("last_sync");
  const report = parseReport(getSetting("last_sync_report"));
  const prices = latestPriceRows();
  const fx = latestFxRows();
  const baseCurrency = getBaseCurrency();
  const today = localToday();

  return (
    <div className="space-y-6">
      <PageHeader
        title="行情同步"
        description="A 股 / 港股 / 美股 / 场外基金 / 上海金 / 汇率，全部走公开接口，失败时保留上次价格。"
        actions={<SyncButton />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted">上次同步</div>
          <div className="mt-2 text-lg font-semibold">
            {lastSync ? new Date(lastSync).toLocaleString("zh-CN", { hour12: false }) : "从未同步"}
          </div>
          <div className="mt-1 text-xs text-muted">
            {report
              ? `成功 ${report.updated.length} 个价格，失败 ${report.failures.length} 个`
              : "点右上角按钮开始第一次同步"}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted">汇率状态</div>
          <div className="mt-2 text-lg font-semibold">
            {report?.fx?.ok ? `${report.fx.count} 对` : "待同步"}
          </div>
          <div className="mt-1 text-xs text-muted">
            来源：{report?.fx?.source ?? "frankfurter"} · 计价货币 {baseCurrency}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted">今日</div>
          <div className="num mt-2 text-lg font-semibold">{today}</div>
          <div className="mt-1 text-xs text-muted">
            价格与汇率均按最近一次成功同步计算
          </div>
        </Card>
      </div>

      {report && report.failures.length > 0 ? (
        <div className="rounded-xl border border-gain/30 bg-gain/5 px-4 py-3 text-xs text-gain">
          <div className="mb-1 font-medium">以下标的同步失败，仍在使用旧价格：</div>
          <ul className="space-y-0.5">
            {report.failures.map((f) => (
              <li key={`${f.market}-${f.symbol}-${f.holdingId}`}>
                {f.name}（{f.market}:{f.symbol}）— {f.error}
              </li>
            ))}
          </ul>
          <Link href="/holdings" className="mt-2 inline-block underline underline-offset-2">
            去持仓页填写手动价
          </Link>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="最新价格"
          subtitle="每个标的仅展示最近一个交易日"
          action={<Badge tone="accent">{prices.length} 个标的</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-medium">标的</th>
                <th className="px-3 py-3 font-medium">市场</th>
                <th className="px-3 py-3 text-right font-medium">最新价</th>
                <th className="px-3 py-3 text-right font-medium">昨收</th>
                <th className="px-3 py-3 text-right font-medium">涨跌</th>
                <th className="px-3 py-3 font-medium">日期</th>
                <th className="px-5 py-3 font-medium">来源</th>
              </tr>
            </thead>
            <tbody>
              {prices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">
                    还没有价格数据，先同步一次。
                  </td>
                </tr>
              ) : (
                prices.map((p) => {
                  const change = p.prev_close ? (p.close - p.prev_close) / p.prev_close : null;
                  return (
                    <tr
                      key={`${p.market}-${p.symbol}`}
                      className="border-t border-border/50 hover:bg-panel-2/50"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium">{p.name || p.symbol}</div>
                        <div className="num text-[11px] text-muted">{p.symbol}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {MARKET_LABELS[p.market as Market] ?? p.market}
                      </td>
                      <td className="num px-3 py-3 text-right">
                        {formatNumber(p.close, p.close < 10 ? 4 : 2)}{" "}
                        <span className="text-[10px] text-muted">{p.currency}</span>
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-muted">
                        {p.prev_close === null ? "—" : formatNumber(p.prev_close, p.prev_close < 10 ? 4 : 2)}
                      </td>
                      <td
                        className={`num px-3 py-3 text-right text-xs ${
                          change === null ? "text-muted" : change >= 0 ? "text-gain" : "text-loss"
                        }`}
                      >
                        {change === null ? "—" : `${change > 0 ? "+" : ""}${(change * 100).toFixed(2)}%`}
                      </td>
                      <td className="num px-3 py-3 text-xs text-muted">{p.date}</td>
                      <td className="px-5 py-3 text-xs text-muted">{p.source}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="汇率" subtitle={`统一以 USD 为基准，折算到 ${baseCurrency}`} />
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {fx.length === 0 ? (
            <p className="text-xs text-muted">还没有汇率数据。</p>
          ) : (
            fx.map((rate) => (
              <div
                key={`${rate.base}-${rate.quote}`}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-panel-2/60 px-3 py-2.5 text-xs"
              >
                <span className="text-muted">
                  {rate.base} → {rate.quote}
                </span>
                <span className="num text-sm">{formatNumber(rate.rate, 4)}</span>
                <span className="num text-[10px] text-muted">{rate.date}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="自动同步" subtitle="每天收盘后跑一次" />
        <div className="space-y-2 px-5 py-4 text-xs leading-relaxed text-muted">
          <p>在项目目录执行一次：</p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-panel-2 px-3 py-2 text-[11px] text-ink">
            pnpm db:sync
          </pre>
          <p>
            可以用 macOS 的 launchd 或 cron 定时执行上面的命令；同步成功后会自动写入当天的资产快照。
          </p>
        </div>
      </Card>
    </div>
  );
}
