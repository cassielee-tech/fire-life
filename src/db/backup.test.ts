import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { initDb } from "./init";
import { buildBackup, restoreBackup, writePreImportBackup } from "./backup";
import { validateBackup } from "../lib/backup";

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  initDb(db);
  return db;
}

function seed(db: Database.Database) {
  db.exec(`
    INSERT INTO accounts (id, name, institution, kind, currency, note, created_at)
    VALUES (1, '招商银行', 'CMB', 'bank', 'CNY', '工资卡', '2026-01-01');

    INSERT INTO categories (id, name, color, created_at)
    VALUES (1, '核心资产', '#5aa2ff', '2026-01-01');

    INSERT INTO holdings
      (id, account_id, category_id, name, symbol, asset_type, market, currency,
       quantity, cost_basis, manual_value, manual_price, closed_at, updated_at)
    VALUES
      (1, 1, 1, '沪深300ETF', '510300', 'fund', 'CN', 'CNY',
       100, 300, NULL, 4.0, NULL, '2026-01-01');

    INSERT INTO prices
      (id, symbol, market, date, close, prev_close, currency, name, source, fetched_at)
    VALUES
      (1, '510300', 'CN', '2026-01-01', 4.2, 4.1, 'CNY', '沪深300ETF', 'eastmoney', '2026-01-01');

    INSERT INTO fx_rates (id, date, base, quote, rate, fetched_at)
    VALUES (1, '2026-01-01', 'USD', 'CNY', 7.1, '2026-01-01');

    INSERT INTO valuations
      (id, date, holding_id, price, fx_rate, market_value, cost, day_change)
    VALUES (1, '2026-01-01', 1, 4.2, 1, 420, 300, 10);

    INSERT INTO realized_trades
      (id, holding_id, account_id, category_id, name, symbol, asset_type, currency,
       sell_date, quantity, cost_basis, proceeds, pnl, fee, cash_credited,
       cash_holding_id, cash_amount, cash_created, note, created_at)
    VALUES
      (1, NULL, 1, NULL, '已清仓', '', 'stock', 'CNY',
       '2026-02-01', 10, 100, 150, 50, 0, 0, NULL, 0, 0, '', '2026-02-01');

    INSERT INTO settings (key, value) VALUES ('base_currency', 'CNY');
    INSERT INTO settings (key, value) VALUES ('last_sync', '2026-03-01');
  `);
}

describe("backup round-trip", () => {
  it("exports and restores every table", () => {
    const source = createDb();
    seed(source);

    const backup = buildBackup(source);
    expect(backup.counts).toMatchObject({
      accounts: 1,
      categories: 1,
      holdings: 1,
      realized_trades: 1,
      prices: 1,
      fx_rates: 1,
      valuations: 1,
      settings: 2,
    });

    const target = createDb();
    target
      .prepare("INSERT INTO accounts (id, name, created_at) VALUES (9, '旧账户', '2026-01-01')")
      .run();

    const result = restoreBackup(target, backup);
    expect(result.counts.accounts).toBe(1);
    expect(
      (target.prepare("SELECT COUNT(*) AS count FROM accounts").get() as { count: number })
        .count,
    ).toBe(1);
    expect(
      (target.prepare("SELECT name FROM accounts WHERE id = 1").get() as { name: string })
        .name,
    ).toBe("招商银行");
    expect(
      (target.prepare("SELECT value FROM settings WHERE key = 'base_currency'").get() as { value: string })
        .value,
    ).toBe("CNY");
    expect(
      (target.prepare("SELECT market_value FROM valuations WHERE id = 1").get() as { market_value: number })
        .market_value,
    ).toBe(420);

    const inserted = target
      .prepare("INSERT INTO accounts (name, created_at) VALUES ('新账户', '2026-04-01')")
      .run();
    expect(Number(inserted.lastInsertRowid)).toBe(2);

    source.close();
    target.close();
  });

  it("writes a valid pre-import backup file", () => {
    const source = createDb();
    seed(source);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fire-life-backup-"));
    try {
      const file = writePreImportBackup(source, dir);
      expect(path.basename(file)).toMatch(/^pre-import-.*\.json$/);
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
      const validation = validateBackup(parsed);
      expect(validation.ok).toBe(true);
      if (validation.ok) {
        expect(validation.backup.tables.holdings).toHaveLength(1);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      source.close();
    }
  });
});
