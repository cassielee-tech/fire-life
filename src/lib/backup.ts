import { z } from "zod";

export const BACKUP_FORMAT = "fire-life-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

const rowSchema = z.record(z.string(), z.unknown());

export const BACKUP_TABLES = [
  "accounts",
  "categories",
  "holdings",
  "realized_trades",
  "prices",
  "fx_rates",
  "valuations",
  "settings",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

const tablesSchema = z.object({
  accounts: z.array(rowSchema),
  categories: z.array(rowSchema),
  holdings: z.array(rowSchema),
  realized_trades: z.array(rowSchema),
  prices: z.array(rowSchema),
  fx_rates: z.array(rowSchema),
  valuations: z.array(rowSchema),
  settings: z.array(rowSchema),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.string(),
  baseCurrency: z.string().optional(),
  counts: z.record(z.string(), z.number()).optional(),
  tables: tablesSchema,
});

export type Backup = z.infer<typeof backupSchema>;

type FieldType = "string" | "number";

const REQUIRED_FIELDS: Record<BackupTableName, Record<string, FieldType>> = {
  accounts: {
    id: "number",
    name: "string",
    created_at: "string",
  },
  categories: {
    id: "number",
    name: "string",
    color: "string",
    created_at: "string",
  },
  holdings: {
    id: "number",
    account_id: "number",
    name: "string",
    symbol: "string",
    asset_type: "string",
    market: "string",
    currency: "string",
    quantity: "number",
    cost_basis: "number",
    updated_at: "string",
  },
  realized_trades: {
    id: "number",
    account_id: "number",
    name: "string",
    symbol: "string",
    asset_type: "string",
    currency: "string",
    sell_date: "string",
    quantity: "number",
    cost_basis: "number",
    proceeds: "number",
    fee: "number",
    created_at: "string",
  },
  prices: {
    id: "number",
    symbol: "string",
    market: "string",
    date: "string",
    close: "number",
    currency: "string",
    source: "string",
    fetched_at: "string",
  },
  fx_rates: {
    id: "number",
    date: "string",
    base: "string",
    quote: "string",
    rate: "number",
    fetched_at: "string",
  },
  valuations: {
    id: "number",
    date: "string",
    holding_id: "number",
    fx_rate: "number",
    market_value: "number",
    cost: "number",
  },
  settings: {
    key: "string",
    value: "string",
  },
};

export type BackupValidation =
  | { ok: true; backup: Backup }
  | { ok: false; error: string };

export function validateBackup(input: unknown): BackupValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "备份文件不是有效的 JSON 对象" };
  }

  const candidate = input as Record<string, unknown>;
  if (candidate.format !== BACKUP_FORMAT) {
    return { ok: false, error: "不是 Fire Life 备份文件" };
  }
  if (candidate.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: "备份版本不兼容，请使用当前版本导出的备份" };
  }

  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "备份格式不正确",
    };
  }

  for (const table of BACKUP_TABLES) {
    const rows = parsed.data.tables[table];
    const required = REQUIRED_FIELDS[table];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      for (const [field, type] of Object.entries(required)) {
        if (!(field in row)) {
          return {
            ok: false,
            error: `${table} 第 ${index + 1} 行缺少字段 ${field}`,
          };
        }
        if (typeof row[field] !== type) {
          return {
            ok: false,
            error: `${table} 第 ${index + 1} 行字段 ${field} 类型不正确`,
          };
        }
      }
      for (const [field, value] of Object.entries(row)) {
        if (value === null) continue;
        const type = typeof value;
        if (type !== "string" && type !== "number" && type !== "boolean") {
          return {
            ok: false,
            error: `${table} 第 ${index + 1} 行字段 ${field} 不是基本类型`,
          };
        }
      }
    }
  }

  return { ok: true, backup: parsed.data };
}

export function countBackupTables(
  backup: Backup,
): Record<BackupTableName, number> {
  return Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, backup.tables[table].length]),
  ) as Record<BackupTableName, number>;
}

export function backupTimestamp(date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "-");
}

export function backupFileName(date = new Date()): string {
  return `fire-life-backup-${backupTimestamp(date)}.json`;
}
