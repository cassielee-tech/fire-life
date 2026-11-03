import { sqliteTable, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  institution: text("institution").notNull().default(""),
  kind: text("kind", { enum: ["bank", "broker", "cash", "other"] })
    .notNull()
    .default("bank"),
  currency: text("currency").notNull().default("CNY"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#5aa2ff"),
  createdAt: text("created_at").notNull(),
});

export const holdings = sqliteTable("holdings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default(""),
  assetType: text("asset_type", {
    enum: ["cash", "deposit", "wealth", "fund", "stock", "gold", "other"],
  })
    .notNull()
    .default("cash"),
  market: text("market", { enum: ["CN", "HK", "US", "FUND", "GOLD", "NONE"] })
    .notNull()
    .default("NONE"),
  currency: text("currency").notNull().default("CNY"),
  quantity: real("quantity").notNull().default(0),
  costBasis: real("cost_basis").notNull().default(0),
  manualValue: real("manual_value"),
  manualPrice: real("manual_price"),
  closedAt: text("closed_at"),
  updatedAt: text("updated_at").notNull(),
});

export const realizedTrades = sqliteTable(
  "realized_trades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    holdingId: integer("holding_id").references(() => holdings.id, {
      onDelete: "set null",
    }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id"),
    name: text("name").notNull(),
    symbol: text("symbol").notNull().default(""),
    assetType: text("asset_type", {
      enum: ["cash", "deposit", "wealth", "fund", "stock", "gold", "other"],
    })
      .notNull()
      .default("other"),
    currency: text("currency").notNull().default("CNY"),
    sellDate: text("sell_date").notNull(),
    quantity: real("quantity").notNull().default(0),
    costBasis: real("cost_basis").notNull().default(0),
    proceeds: real("proceeds").notNull().default(0),
    pnl: real("pnl"),
    fee: real("fee").notNull().default(0),
    cashCredited: integer("cash_credited").notNull().default(0),
    cashHoldingId: integer("cash_holding_id"),
    cashAmount: real("cash_amount").notNull().default(0),
    cashCreated: integer("cash_created").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("realized_trades_sell_date").on(t.sellDate, t.id)],
);

export const prices = sqliteTable(
  "prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    market: text("market").notNull(),
    date: text("date").notNull(),
    close: real("close").notNull(),
    prevClose: real("prev_close"),
    currency: text("currency").notNull(),
    name: text("name").notNull().default(""),
    source: text("source").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [uniqueIndex("prices_symbol_market_date").on(t.symbol, t.market, t.date)],
);

export const fxRates = sqliteTable(
  "fx_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: real("rate").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (t) => [uniqueIndex("fx_pair_date").on(t.date, t.base, t.quote)],
);

export const valuations = sqliteTable(
  "valuations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    holdingId: integer("holding_id")
      .notNull()
      .references(() => holdings.id, { onDelete: "cascade" }),
    price: real("price"),
    fxRate: real("fx_rate").notNull(),
    marketValue: real("market_value").notNull(),
    cost: real("cost").notNull(),
    dayChange: real("day_change").notNull().default(0),
  },
  (t) => [uniqueIndex("valuations_date_holding").on(t.date, t.holdingId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Holding = typeof holdings.$inferSelect;
export type RealizedTrade = typeof realizedTrades.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type Valuation = typeof valuations.$inferSelect;
