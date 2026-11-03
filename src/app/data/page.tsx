import { BackupManager } from "@/components/backup-manager";
import { PageHeader } from "@/components/ui";
import { sqlite } from "@/db";
import { getBackupCounts } from "@/db/backup";
import { getPortfolio } from "@/db/queries";

export const dynamic = "force-dynamic";

export default function DataPage() {
  const portfolio = getPortfolio();
  const counts = getBackupCounts(sqlite);

  return (
    <div className="space-y-6">
      <PageHeader
        title="数据备份"
        description="一键导出全部数据，或从 JSON 备份完整恢复。"
      />
      <BackupManager
        currentCounts={counts}
        baseCurrency={portfolio.baseCurrency}
        today={portfolio.today}
      />
    </div>
  );
}
