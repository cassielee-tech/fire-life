import { FireCalculator } from "@/components/fire-calculator";
import { PageHeader } from "@/components/ui";
import { getPortfolio } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function FirePage() {
  const portfolio = getPortfolio();

  return (
    <div className="space-y-6">
      <PageHeader
        title="FIRE 计算器"
        description="输入目标金额、年结余和预期收益，估算达成财务自由所需时间。"
      />
      <FireCalculator
        key={portfolio.baseCurrency}
        currentAssets={portfolio.summary.totalValue}
        currency={portfolio.baseCurrency}
        today={portfolio.today}
      />
    </div>
  );
}
