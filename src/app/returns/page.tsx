import { ReturnsManager } from "@/components/returns-manager";
import { PageHeader } from "@/components/ui";
import { getPortfolio, latestFxPairs, listRealizedTrades } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function ReturnsPage() {
  const portfolio = getPortfolio();
  const trades = listRealizedTrades();
  const fxPairs = latestFxPairs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="收益管理"
        description="已卖出 / 已清仓收益；今年收益率只统计已实现部分，当前浮动单独展示。"
      />
      <ReturnsManager
        trades={trades}
        accounts={portfolio.accounts.map((account) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
        }))}
        categories={portfolio.categories.map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
        }))}
        fxPairs={fxPairs}
        baseCurrency={portfolio.baseCurrency}
        currentFloating={portfolio.summary.totalPnl}
        today={portfolio.today}
      />
    </div>
  );
}
