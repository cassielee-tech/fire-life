import { AccountsManager, type AccountRow } from "@/components/accounts-manager";
import { PageHeader } from "@/components/ui";
import { getPortfolio } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const portfolio = getPortfolio();

  const rows: AccountRow[] = portfolio.accounts.map((account) => {
    const related = portfolio.valuations.filter((v) => v.accountId === account.id);
    return {
      id: account.id,
      name: account.name,
      institution: account.institution,
      kind: account.kind,
      currency: account.currency,
      note: account.note,
      holdingCount: related.length,
      marketValue: related.reduce((sum, v) => sum + v.marketValue, 0),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="账户管理"
        description="把资产按真实账户归集：银行、券商、海外账户各自独立。"
      />
      <AccountsManager accounts={rows} baseCurrency={portfolio.baseCurrency} />
    </div>
  );
}
