"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui";
import {
  BACKUP_TABLES,
  MAX_BACKUP_BYTES,
  countBackupTables,
  validateBackup,
  type Backup,
  type BackupTableName,
} from "@/lib/backup";

type Counts = Record<BackupTableName, number>;

const TABLE_LABELS: Record<BackupTableName, string> = {
  accounts: "账户",
  categories: "分类",
  holdings: "持仓",
  realized_trades: "收益记录",
  prices: "行情",
  fx_rates: "汇率",
  valuations: "历史快照",
  settings: "设置",
};

function CountGrid({
  counts,
}: {
  counts: Partial<Record<BackupTableName, number>>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {BACKUP_TABLES.map((table) => (
        <div
          key={table}
          className="rounded-lg border border-border/60 bg-panel-2/60 px-3 py-2"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted">
            {TABLE_LABELS[table]}
          </div>
          <div className="num mt-0.5 text-sm font-medium">
            {counts[table] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BackupManager({
  currentCounts,
  baseCurrency,
  today,
}: {
  currentCounts: Counts;
  baseCurrency: string;
  today: string;
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [previewCounts, setPreviewCounts] = useState<Counts | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    counts: Counts;
    backupFile: string;
  } | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(null);
    setSuccess(null);
    setConfirmed(false);
    setPreview(null);
    setPreviewCounts(null);
    setFileName(null);

    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError("备份文件过大，最大支持 50 MB");
      input.value = "";
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const validation = validateBackup(parsed);
      if (!validation.ok) {
        setError(validation.error);
        input.value = "";
        return;
      }
      setFileName(file.name);
      setPreview(validation.backup);
      setPreviewCounts(countBackupTables(validation.backup));
    } catch {
      setError("无法读取或解析备份文件");
    } finally {
      input.value = "";
    }
  }

  async function importBackup() {
    if (!preview || !confirmed) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        counts?: Counts;
        backupFile?: string;
        error?: string;
      };
      if (!res.ok || !data.counts) {
        throw new Error(data.error ?? "导入失败");
      }
      setSuccess({
        counts: data.counts,
        backupFile: data.backupFile ?? "",
      });
      setPreview(null);
      setPreviewCounts(null);
      setFileName(null);
      setConfirmed(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="一键导出"
            subtitle={`当前计价货币 ${baseCurrency} · ${today}`}
          />
          <div className="space-y-4 px-5 py-4">
            <CountGrid counts={currentCounts} />
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/backup/export"
                className="rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-medium text-accent transition hover:bg-accent/25"
              >
                下载全量备份（JSON）
              </a>
              <a
                href="/api/export"
                className="rounded-lg border border-border bg-panel-2 px-4 py-2 text-xs text-muted transition hover:text-ink"
              >
                导出持仓 CSV
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              全量备份包含账户、分类、持仓、收益记录、行情、汇率、历史快照和设置。
              文件名形如 fire-life-backup-20261103-113000.json。
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="一键导入"
            subtitle="选择 JSON 备份，覆盖当前全部数据"
          />
          <div className="space-y-4 px-5 py-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-panel-2/40 px-4 py-8 text-center text-sm text-muted transition hover:border-accent/50 hover:text-ink">
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => void handleFile(event)}
                className="hidden"
              />
              <span className="font-medium">
                {fileName ?? "选择 JSON 备份文件"}
              </span>
              <span className="mt-1 text-[11px]">
                支持 .json，最大 50 MB；导入前会自动备份当前数据
              </span>
            </label>

            {preview && previewCounts ? (
              <div className="space-y-3">
                <div className="text-[11px] leading-relaxed text-muted">
                  导出时间：
                  {new Date(preview.exportedAt).toLocaleString("zh-CN", {
                    hour12: false,
                  })}
                  {" · "}备份版本：{preview.formatVersion}
                  {" · "}计价货币：
                  {preview.baseCurrency ?? baseCurrency}
                </div>
                <CountGrid counts={previewCounts} />
                <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[11px] leading-relaxed text-gold">
                  导入会清空当前全部数据并还原这份备份。导入前会自动把当前数据保存到
                  data/backups/。
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                  />
                  我已确认覆盖当前全部数据
                </label>
                <button
                  type="button"
                  onClick={() => void importBackup()}
                  disabled={!confirmed || busy}
                  className="rounded-lg border border-gain/40 bg-gain/10 px-4 py-2 text-xs font-medium text-gain transition hover:bg-gain/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "导入中…" : "覆盖并导入"}
                </button>
              </div>
            ) : null}

            {success ? (
              <div className="rounded-lg border border-loss/30 bg-loss/5 px-3 py-3 text-xs text-loss">
                <div className="font-medium">导入成功</div>
                <div className="mt-1 text-muted">
                  已恢复账户 {success.counts.accounts}、持仓{" "}
                  {success.counts.holdings}、收益记录{" "}
                  {success.counts.realized_trades} 等数据。
                </div>
                <div className="mt-1 break-all text-[10px] text-muted">
                  导入前备份：{success.backupFile}
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 text-accent hover:underline"
                >
                  重新加载页面
                </button>
              </div>
            ) : null}

            {error ? <p className="text-xs text-gain">{error}</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-1.5 px-5 py-4 text-xs leading-relaxed text-muted">
          <p>导入是覆盖式恢复，不会合并现有数据。</p>
          <p>
            备份文件包含完整财务数据，请妥善保存；主题偏好在浏览器本地，不包含在备份中。
          </p>
          <p>导入失败时数据库会回滚，导入前备份仍保留在 data/backups/。</p>
        </div>
      </Card>
    </div>
  );
}
