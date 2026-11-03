import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  countBackupTables,
  type Backup,
  type BackupTableName,
} from "../lib/backup";

const num = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const nullableNum = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const nullableStr = (value: unknown) =>
  typeof value === "string" ? value : null;

const flag = (value: unknown) => (value === 1 || value === true ? 1 : 0);

export function buildBackup(sqlite: Database.Database): Backup {
  const result = sqlite.transaction(() => {
    const tables = {
      accounts: sqlite.prepare("SELECT * FROM accounts ORDER BY id").all(),
      categories: sqlite.prepare("SELECT * FROM categories ORDER BY id").all(),
      holdings: sqlite.prepare("SELECT * FROM holdings ORDER BY id").all(),
      realized_trades: sqlite
        .prepare("SELECT * FROM realized_trades ORDER BY id")
        .all(),
      prices: sqlite.prepare("SELECT * FROM prices ORDER BY id").all(),
      fx_rates: sqlite.prepare("SELECT * FROM fx_rates ORDER BY id").all(),
      valuations: sqlite
        .prepare("SELECT * FROM valuations ORDER BY id")
        .all(),
      settings: sqlite.prepare("SELECT * FROM settings ORDER BY key").all(),
    } as Backup["tables"];

    const baseCurrency =
      (
        sqlite
          .prepare("SELECT value FROM settings WHERE key = 'base_currency'")
          .get() as { value: string } | undefined
      )?.value ?? "CNY";

    return { tables, baseCurrency };
  })();

  const backup: Backup = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    baseCurrency: result.baseCurrency,
    tables: result.tables,
  };
  backup.counts = countBackupTables(backup);
  return backup;
}

export function getBackupCounts(
  sqlite: Database.Database,
): Record<BackupTableName, number> {
  return Object.fromEntries(
    BACKUP_TABLES.map((table) => {
      const row = sqlite
        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
        .get() as { count: number };
      return [table, row.count];
    }),
  ) as Record<BackupTableName, number>;
}

export function restoreBackup(
  sqlite: Database.Database,
  backup: Backup,
): { counts: Record<BackupTableName, number> } {
  sqlite.transaction(() => {
    for (const table of [
      "realized_trades",
      "valuations",
      "prices",
      "fx_rates",
      "holdings",
      "categories",
      "accounts",
      "settings",
    ]) {
      sqlite.prepare(`DELETE FROM ${table}`).run();
    }

    const insertAccount = sqlite.prepare(
      `INSERT INTO accounts (id, name, institution, kind, currency, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.accounts) {
      insertAccount.run(
        num(row.id),
        str(row.name),
        str(row.institution),
        str(row.kind, "bank"),
        str(row.currency, "CNY"),
        str(row.note),
        str(row.created_at, new Date().toISOString()),
      );
    }

    const insertCategory = sqlite.prepare(
      `INSERT INTO categories (id, name, color, created_at)
       VALUES (?, ?, ?, ?)`,
    );
    for (const row of backup.tables.categories) {
      insertCategory.run(
        num(row.id),
        str(row.name),
        str(row.color, "#5aa2ff"),
        str(row.created_at, new Date().toISOString()),
      );
    }

    const insertHolding = sqlite.prepare(
      `INSERT INTO holdings
        (id, account_id, category_id, name, symbol, asset_type, market, currency,
         quantity, cost_basis, manual_value, manual_price, closed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.holdings) {
      insertHolding.run(
        num(row.id),
        num(row.account_id),
        nullableNum(row.category_id),
        str(row.name),
        str(row.symbol),
        str(row.asset_type, "cash"),
        str(row.market, "NONE"),
        str(row.currency, "CNY"),
        num(row.quantity),
        num(row.cost_basis),
        nullableNum(row.manual_value),
        nullableNum(row.manual_price),
        nullableStr(row.closed_at),
        str(row.updated_at, new Date().toISOString()),
      );
    }

    const insertPrice = sqlite.prepare(
      `INSERT INTO prices
        (id, symbol, market, date, close, prev_close, currency, name, source, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.prices) {
      insertPrice.run(
        num(row.id),
        str(row.symbol),
        str(row.market),
        str(row.date),
        num(row.close),
        nullableNum(row.prev_close),
        str(row.currency, "CNY"),
        str(row.name),
        str(row.source),
        str(row.fetched_at, new Date().toISOString()),
      );
    }

    const insertFx = sqlite.prepare(
      `INSERT INTO fx_rates (id, date, base, quote, rate, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.fx_rates) {
      insertFx.run(
        num(row.id),
        str(row.date),
        str(row.base),
        str(row.quote),
        num(row.rate),
        str(row.fetched_at, new Date().toISOString()),
      );
    }

    const insertValuation = sqlite.prepare(
      `INSERT INTO valuations
        (id, date, holding_id, price, fx_rate, market_value, cost, day_change)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.valuations) {
      insertValuation.run(
        num(row.id),
        str(row.date),
        num(row.holding_id),
        nullableNum(row.price),
        num(row.fx_rate, 1),
        num(row.market_value),
        num(row.cost),
        num(row.day_change),
      );
    }

    const insertRealized = sqlite.prepare(
      `INSERT INTO realized_trades
        (id, holding_id, account_id, category_id, name, symbol, asset_type,
         currency, sell_date, quantity, cost_basis, proceeds, pnl, fee,
         cash_credited, cash_holding_id, cash_amount, cash_created, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of backup.tables.realized_trades) {
      insertRealized.run(
        num(row.id),
        nullableNum(row.holding_id),
        num(row.account_id),
        nullableNum(row.category_id),
        str(row.name),
        str(row.symbol),
        str(row.asset_type, "other"),
        str(row.currency, "CNY"),
        str(row.sell_date),
        num(row.quantity),
        num(row.cost_basis),
        num(row.proceeds),
        nullableNum(row.pnl),
        num(row.fee),
        flag(row.cash_credited),
        nullableNum(row.cash_holding_id),
        num(row.cash_amount),
        flag(row.cash_created),
        str(row.note),
        str(row.created_at, new Date().toISOString()),
      );
    }

    const insertSetting = sqlite.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?)",
    );
    for (const row of backup.tables.settings) {
      insertSetting.run(str(row.key), str(row.value));
    }
    const hasBaseCurrency = sqlite
      .prepare("SELECT 1 FROM settings WHERE key = 'base_currency'")
      .get();
    if (!hasBaseCurrency) {
      insertSetting.run("base_currency", backup.baseCurrency ?? "CNY");
    }

    const sequenceTables = [
      "accounts",
      "categories",
      "holdings",
      "prices",
      "fx_rates",
      "valuations",
      "realized_trades",
    ] as const;
    for (const table of sequenceTables) {
      const max = (
        sqlite.prepare(`SELECT COALESCE(MAX(id), 0) AS max FROM ${table}`).get() as {
          max: number;
        }
      ).max;
      const existing = sqlite
        .prepare("SELECT seq FROM sqlite_sequence WHERE name = ?")
        .get(table) as { seq: number } | undefined;
      if (existing) {
        sqlite
          .prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = ?")
          .run(max, table);
      } else {
        sqlite
          .prepare("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)")
          .run(table, max);
      }
    }
  })();

  return { counts: countBackupTables(backup) };
}

export function writePreImportBackup(
  sqlite: Database.Database,
  backupDir: string,
): string {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `pre-import-${stamp}.json`);
  const backup = buildBackup(sqlite);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2), "utf8");
  return file;
}
