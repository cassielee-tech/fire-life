import { TrendChart } from "@/components/charts";
import { SnapshotButton } from "@/components/snapshot-button";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { getHistory, getPortfolio } from "@/db/queries";
import { formatMoney, formatPct, toneClass } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const history = getHistory();
  const portfolio = getPortfolio();
  const latest = history[history.length - 1];
  const first = history[0];

  const rows = [...history].reverse();
  const byDate = new Map(history.map((h) => [h.date, h]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="历史快照"
        description="每次同步行情后会自动记录当日估值；也可手动补记。"
        actions={<SnapshotButton />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">快照天数</div>
          <div className="num mt-1 text-xl font-semibold">{history.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">最新总资产</div>
          <div className="num mt-1 text-xl font-semibold">
            {latest ? formatMoney(latest.value, portfolio.baseCurrency, 0) : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">区间变化</div>
          <div
            className={`num mt-1 text-xl font-semibold ${
              first && latest ? toneClass(latest.value - first.value) : ""
            }`}
          >
            {first && latest
              ? formatPct(first.value > 0 ? (latest.value - first.value) / first.value : null)
              : "—"}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="资产曲线"
          subtitle={history.length > 0 ? `${first.date} 至 ${latest.date}` : "暂无数据"}
        />
        <TrendChart data={history} currency={portfolio.baseCurrency} />
      </Card>

      <Card>
        <CardHeader title="每日记录" subtitle="按日期倒序" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-medium">日期</th>
                <th className="px-3 py-3 text-right font-medium">总资产</th>
                <th className="px-3 py-3 text-right font-medium">成本</th>
                <th className="px-3 py-3 text-right font-medium">浮动盈亏</th>
                <th className="px-3 py-3 text-right font-medium">收益率</th>
                <th className="px-5 py-3 text-right font-medium">当日涨跌</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">
                    还没有快照，点击右上角「记录今日快照」或同步一次行情。
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const prev = [...history]
                    .reverse()
                    .find((h) => h.date < row.date);
                  const reference = prev ? byDate.get(prev.date) : undefined;
                  const dayPct =
                    reference && reference.value > 0
                      ? (row.value - reference.value) / reference.value
                      : null;
                  return (
                    <tr key={row.date} className="border-t border-border/50 hover:bg-panel-2/50">
                      <td className="num px-5 py-3 text-xs">{row.date}</td>
                      <td className="num px-3 py-3 text-right">
                        {formatMoney(row.value, portfolio.baseCurrency, 0)}
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-muted">
                        {formatMoney(row.cost, portfolio.baseCurrency, 0)}
                      </td>
                      <td className={`num px-3 py-3 text-right text-xs ${toneClass(row.pnl)}`}>
                        {formatMoney(row.pnl, portfolio.baseCurrency, 0)}
                      </td>
                      <td className={`num px-3 py-3 text-right text-xs ${toneClass(row.pnl)}`}>
                        {formatPct(row.cost > 0 ? row.pnl / row.cost : null)}
                      </td>
                      <td className={`num px-5 py-3 text-right text-xs ${toneClass(dayPct)}`}>
                        {formatPct(dayPct)}
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
