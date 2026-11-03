import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  countBackupTables,
  validateBackup,
  type Backup,
} from "./backup";

function emptyBackup(): Backup {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: "2026-11-03T03:30:00.000Z",
    baseCurrency: "CNY",
    tables: {
      accounts: [],
      categories: [],
      holdings: [],
      realized_trades: [],
      prices: [],
      fx_rates: [],
      valuations: [],
      settings: [],
    },
  };
}

describe("validateBackup", () => {
  it("accepts a valid empty backup", () => {
    expect(validateBackup(emptyBackup()).ok).toBe(true);
  });

  it("rejects a different format", () => {
    const result = validateBackup({ ...emptyBackup(), format: "other" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Fire Life");
  });

  it("rejects an incompatible version", () => {
    const result = validateBackup({ ...emptyBackup(), formatVersion: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("版本");
  });

  it("rejects a missing table", () => {
    const backup = emptyBackup() as unknown as {
      tables: Record<string, unknown>;
    };
    delete backup.tables.settings;
    expect(validateBackup(backup).ok).toBe(false);
  });

  it("rejects a row with missing required fields", () => {
    const backup = emptyBackup();
    backup.tables.accounts.push({ id: 1, name: "招商银行" });
    const result = validateBackup(backup);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("created_at");
  });

  it("rejects nested row values", () => {
    const backup = emptyBackup();
    backup.tables.settings.push({ key: "base_currency", value: { x: 1 } });
    const result = validateBackup(backup);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("类型不正确");
  });
});

describe("countBackupTables", () => {
  it("counts rows per table", () => {
    const backup = emptyBackup();
    backup.tables.accounts.push({
      id: 1,
      name: "招商银行",
      created_at: "2026-01-01",
    });
    const counts = countBackupTables(backup);
    expect(counts.accounts).toBe(1);
    expect(counts.holdings).toBe(0);
  });
});
