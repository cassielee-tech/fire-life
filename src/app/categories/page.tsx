import { CategoriesManager, type CategoryRow } from "@/components/categories-manager";
import { Card, PageHeader } from "@/components/ui";
import { getPortfolio } from "@/db/queries";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  const portfolio = getPortfolio();

  const rows: CategoryRow[] = portfolio.categories.map((category) => {
    const related = portfolio.valuations.filter(
      (v) => v.categoryId === category.id,
    );
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      holdingCount: related.length,
      marketValue: related.reduce((sum, v) => sum + v.marketValue, 0),
    };
  });

  const uncategorized = portfolio.valuations.filter(
    (v) => v.categoryId === null,
  );
  const categorizedValue = rows.reduce((sum, c) => sum + c.marketValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="自定义分类"
        description="按投资目标或风险偏好给持仓分组，总览饼图可切换到这些分类。"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">分类数</div>
          <div className="num mt-1 text-xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">已分类市值</div>
          <div className="num mt-1 text-xl font-semibold">
            {formatMoney(categorizedValue, portfolio.baseCurrency, 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">未分类</div>
          <div className="num mt-1 text-xl font-semibold">
            {uncategorized.length} 笔 ·{" "}
            {formatMoney(
              uncategorized.reduce((sum, v) => sum + v.marketValue, 0),
              portfolio.baseCurrency,
              0,
            )}
          </div>
        </Card>
      </div>

      <CategoriesManager categories={rows} currency={portfolio.baseCurrency} />

      <Card>
        <div className="px-5 py-4 text-xs leading-relaxed text-muted">
          在「持仓」页的每一行可以直接切换分类；新建或编辑持仓时也能选择分类。删除分类后，相关持仓会回到「未分类」。
        </div>
      </Card>
    </div>
  );
}
