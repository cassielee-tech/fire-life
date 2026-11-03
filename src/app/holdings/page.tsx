import { HoldingsManager, type ManagerRow } from "@/components/holdings-manager";
import { SyncButton } from "@/components/sync-button";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { getPortfolio } from "@/db/queries";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HoldingsPage() {
  const portfolio = getPortfolio();
  const holdingById = new Map(portfolio.holdings.map((h) => [h.id, h]));

  const rows: ManagerRow[] = portfolio.valuations.map((v) => {
    const h = holdingById.get(v.id)!;
    return {
      id: v.id,
      accountId: v.accountId,
      categoryId: h.categoryId,
      name: v.name,
      symbol: v.symbol,
      assetType: v.assetType,
      market: v.market,
      currency: v.currency,
      quantity: v.quantity,
      price: v.price,
      costBasis: h.costBasis,
      costPrice: v.costPrice,
      manualValue: h.manualValue,
      manualPrice: h.manualPrice,
      marketValue: v.marketValue,
      pnl: v.pnl,
      pnlPct: v.pnlPct,
      priceSource: v.priceSource,
      priceDate: v.priceDate,
      stale: v.stale,
    };
  });

  const accounts = portfolio.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
  }));

  const categories = portfolio.categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="持仓管理"
        description="现金、理财、基金、股票统一记录；行情资产的价格会自动更新。"
        actions={<SyncButton label="同步价格" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">持仓笔数</div>
          <div className="num mt-1 text-xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">总市值</div>
          <div className="num mt-1 text-xl font-semibold">
            {formatMoney(portfolio.summary.totalValue, portfolio.baseCurrency, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">需补数据</div>
          <div className="num mt-1 text-xl font-semibold">
            {portfolio.summary.missingPriceCount + portfolio.summary.missingFxCount}
          </div>
        </Card>
      </div>

      <HoldingsManager
        rows={rows}
        accounts={accounts}
        categories={categories}
        currency={portfolio.baseCurrency}
      />

      <Card>
        <CardHeader
          title="填写说明"
          subtitle="如何得到更准确的估值"
        />
        <ul className="list-disc space-y-1.5 px-8 py-4 text-xs leading-relaxed text-muted">
          <li>股票 / 基金 / 理财：填写「份额」和「成本价」，总成本 = 份额 × 成本价，自动计算。</li>
          <li>理财：额外填写「当前净值」，市值 = 份额 × 当前净值。</li>
          <li>黄金：填写克数和元/克成本价，金价自动同步上海金（AU9999 / AU9995 / AUTD），也可手动覆盖。</li>
          <li>黄金 ETF（如 518880）请用「股票 / 基金」类型录入，按份额估值。</li>
          <li>基金：代码填 6 位基金代码（如 000001），价格取最近一个交易日的单位净值。</li>
          <li>A 股 / 港股 / 美股：代码填写后价格从行情接口同步，红利再投入时更新成本价即可。</li>
          <li>减少持仓数量请使用表格中的「卖出」，直接改数量不会生成已实现收益记录。</li>
          <li>自定义分类：在「分类」页创建，或在持仓表单里快速新建；一笔持仓只属于一个分类。</li>
          <li>现金 / 存款 / 其他：填写「当前市值」和「总成本」，两者之差即浮动盈亏。</li>
          <li>手动价优先级最高，适合行情接口暂不可用的标的；留空则走自动行情。</li>
          <li>修改份额、成本价或净值后，建议同步一次以生成当天快照。</li>
        </ul>
      </Card>
    </div>
  );
}
