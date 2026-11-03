import type Database from "better-sqlite3";

const DDL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#5aa2ff',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories(name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'bank',
  currency TEXT NOT NULL DEFAULT 'CNY',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  asset_type TEXT NOT NULL DEFAULT 'cash',
  market TEXT NOT NULL DEFAULT 'NONE',
  currency TEXT NOT NULL DEFAULT 'CNY',
  quantity REAL NOT NULL DEFAULT 0,
  cost_basis REAL NOT NULL DEFAULT 0,
  manual_value REAL,
  manual_price REAL,
  closed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS realized_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holding_id INTEGER REFERENCES holdings(id) ON DELETE SET NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  asset_type TEXT NOT NULL DEFAULT 'other',
  currency TEXT NOT NULL DEFAULT 'CNY',
  sell_date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  cost_basis REAL NOT NULL DEFAULT 0,
  proceeds REAL NOT NULL DEFAULT 0,
  pnl REAL,
  fee REAL NOT NULL DEFAULT 0,
  cash_credited INTEGER NOT NULL DEFAULT 0,
  cash_holding_id INTEGER,
  cash_amount REAL NOT NULL DEFAULT 0,
  cash_created INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS realized_trades_sell_date ON realized_trades(sell_date);

CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL,
  date TEXT NOT NULL,
  close REAL NOT NULL,
  prev_close REAL,
  currency TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS prices_symbol_market_date ON prices(symbol, market, date);

CREATE TABLE IF NOT EXISTS fx_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate REAL NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS fx_pair_date ON fx_rates(date, base, quote);

CREATE TABLE IF NOT EXISTS valuations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  price REAL,
  fx_rate REAL NOT NULL,
  market_value REAL NOT NULL,
  cost REAL NOT NULL,
  day_change REAL NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS valuations_date_holding ON valuations(date, holding_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function initDb(sqlite: Database.Database) {
  sqlite.exec(DDL);

  const columns = sqlite.prepare("PRAGMA table_info(holdings)").all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === "category_id")) {
    sqlite.exec("ALTER TABLE holdings ADD COLUMN category_id INTEGER");
  }
  if (!columns.some((column) => column.name === "closed_at")) {
    sqlite.exec("ALTER TABLE holdings ADD COLUMN closed_at TEXT");
  }

  const realizedColumns = sqlite
    .prepare("PRAGMA table_info(realized_trades)")
    .all() as Array<{ name: string }>;
  if (!realizedColumns.some((column) => column.name === "pnl")) {
    sqlite.exec("ALTER TABLE realized_trades ADD COLUMN pnl REAL");
  }
}
