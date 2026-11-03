import { and, asc, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db, sqlite } from "./index";
import {
  accounts,
  categories,
  fxRates,
  holdings,
  prices,
  realizedTrades,
  settings,
  type Account,
  type Category,
  type Holding,
  type RealizedTrade,
} from "./schema";
import { computeSellAllocation } from "@/lib/returns";
import {
  quoteKey,
  summarize,
  valuateAll,
  type AssetType,
  type FxPair,
  type HoldingValuation,
  type Market,
  type Quote,
  type Summary,
} from "@/lib/valuation";

export type AccountInput = {
  name: string;
  institution?: string;
  kind?: "bank" | "broker" | "cash" | "other";
  currency?: string;
  note?: string;
};

export type CategoryInput = {
  name: string;
  color?: string;
};

export type HoldingInput = {
  accountId: number;
  categoryId?: number | null;
  name: string;
  symbol?: string;
  assetType?: AssetType;
  market?: Market;
  currency?: string;
  quantity?: number;
  costBasis?: number;
  manualValue?: number | null;
  manualPrice?: number | null;
};

export function listCategories(): Category[] {
  return db.select().from(categories).orderBy(asc(categories.name)).all();
}

export function getCategory(id: number): Category | undefined {
  return db.select().from(categories).where(eq(categories.id, id)).get();
}

export function findCategoryByName(
  name: string,
  excludeId?: number,
): { id: number; name: string } | undefined {
  const row = sqlite
    .prepare("SELECT id, name FROM categories WHERE name = ? COLLATE NOCASE")
    .get(name) as { id: number; name: string } | undefined;
  if (row && row.id !== excludeId) return row;
  return undefined;
}

export function createCategory(input: CategoryInput): Category {
  return db
    .insert(categories)
    .values({
      name: input.name.trim(),
      color: input.color ?? "#5aa2ff",
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateCategory(
  id: number,
  input: Partial<CategoryInput>,
): Category | undefined {
  return db
    .update(categories)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    })
    .where(eq(categories.id, id))
    .returning()
    .get();
}

export function deleteCategory(id: number): boolean {
  return sqlite.transaction(() => {
    sqlite
      .prepare("UPDATE holdings SET category_id = NULL WHERE category_id = ?")
      .run(id);
    sqlite
      .prepare("UPDATE realized_trades SET category_id = NULL WHERE category_id = ?")
      .run(id);
    return db.delete(categories).where(eq(categories.id, id)).run().changes > 0;
  })();
}

export function listAccounts(): Account[] {
  return db.select().from(accounts).orderBy(asc(accounts.id)).all();
}

export function getAccount(id: number): Account | undefined {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function createAccount(input: AccountInput): Account {
  return db
    .insert(accounts)
    .values({
      name: input.name,
      institution: input.institution ?? "",
      kind: input.kind ?? "bank",
      currency: input.currency ?? "CNY",
      note: input.note ?? "",
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateAccount(id: number, input: Partial<AccountInput>): Account | undefined {
  return db
    .update(accounts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.institution !== undefined ? { institution: input.institution } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .where(eq(accounts.id, id))
    .returning()
    .get();
}

export function deleteAccount(id: number): boolean {
  return db.delete(accounts).where(eq(accounts.id, id)).run().changes > 0;
}

export function listHoldings(
  accountId?: number,
  categoryId?: number | null,
): Holding[] {
  const conditions: SQL[] = [isNull(holdings.closedAt)];
  if (accountId !== undefined) {
    conditions.push(eq(holdings.accountId, accountId));
  }
  if (categoryId !== undefined) {
    conditions.push(
      categoryId === null
        ? isNull(holdings.categoryId)
        : eq(holdings.categoryId, categoryId),
    );
  }
  return db
    .select()
    .from(holdings)
    .where(and(...conditions))
    .orderBy(asc(holdings.id))
    .all();
}

export function getHolding(id: number): Holding | undefined {
  return db.select().from(holdings).where(eq(holdings.id, id)).get();
}

export function createHolding(input: HoldingInput): Holding {
  return db
    .insert(holdings)
    .values({
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      name: input.name,
      symbol: (input.symbol ?? "").trim().toUpperCase(),
      assetType: input.assetType ?? "cash",
      market: input.market ?? "NONE",
      currency: input.currency ?? "CNY",
      quantity: input.quantity ?? 0,
      costBasis: input.costBasis ?? 0,
      manualValue: input.manualValue ?? null,
      manualPrice: input.manualPrice ?? null,
      updatedAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateHolding(id: number, input: Partial<HoldingInput>): Holding | undefined {
  return db
    .update(holdings)
    .set({
      ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.symbol !== undefined
        ? { symbol: input.symbol.trim().toUpperCase() }
        : {}),
      ...(input.assetType !== undefined ? { assetType: input.assetType } : {}),
      ...(input.market !== undefined ? { market: input.market } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.costBasis !== undefined ? { costBasis: input.costBasis } : {}),
      ...(input.manualValue !== undefined ? { manualValue: input.manualValue } : {}),
      ...(input.manualPrice !== undefined ? { manualPrice: input.manualPrice } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(holdings.id, id))
    .returning()
    .get();
}

export function deleteHolding(id: number): boolean {
  return db.delete(holdings).where(eq(holdings.id, id)).run().changes > 0;
}

export type RealizedInput = {
  holdingId?: number | null;
  accountId: number;
  categoryId?: number | null;
  name: string;
  symbol?: string;
  assetType?: AssetType;
  currency: string;
  sellDate: string;
  quantity?: number;
  costBasis: number;
  proceeds: number;
  pnl?: number | null;
  fee?: number;
  note?: string;
};

export type RealizedPatch = Partial<Omit<RealizedInput, "holdingId">>;

export type SellInput = {
  holdingId: number;
  quantity: number;
  price: number;
  fee: number;
  sellDate: string;
  creditCash: boolean;
};

export function listRealizedTrades(
  accountId?: number,
  categoryId?: number | null,
): RealizedTrade[] {
  const conditions: SQL[] = [];
  if (accountId !== undefined) {
    conditions.push(eq(realizedTrades.accountId, accountId));
  }
  if (categoryId !== undefined) {
    conditions.push(
      categoryId === null
        ? isNull(realizedTrades.categoryId)
        : eq(realizedTrades.categoryId, categoryId),
    );
  }
  const query = db.select().from(realizedTrades);
  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(realizedTrades.sellDate), desc(realizedTrades.id))
      .all();
  }
  return query
    .orderBy(desc(realizedTrades.sellDate), desc(realizedTrades.id))
    .all();
}

export function getRealizedTrade(id: number): RealizedTrade | undefined {
  return db.select().from(realizedTrades).where(eq(realizedTrades.id, id)).get();
}

export function createRealizedTrade(input: RealizedInput): RealizedTrade {
  return db
    .insert(realizedTrades)
    .values({
      holdingId: input.holdingId ?? null,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      name: input.name.trim(),
      symbol: (input.symbol ?? "").trim().toUpperCase(),
      assetType: input.assetType ?? "other",
      currency: input.currency.trim().toUpperCase(),
      sellDate: input.sellDate,
      quantity: input.quantity ?? 0,
      costBasis: input.costBasis,
      proceeds: input.proceeds,
      pnl: input.pnl ?? null,
      fee: input.fee ?? 0,
      cashCredited: 0,
      cashHoldingId: null,
      cashAmount: 0,
      cashCreated: 0,
      note: input.note ?? "",
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

export function updateRealizedTrade(
  id: number,
  input: RealizedPatch,
): RealizedTrade | undefined {
  return db
    .update(realizedTrades)
    .set({
      ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.symbol !== undefined
        ? { symbol: input.symbol.trim().toUpperCase() }
        : {}),
      ...(input.assetType !== undefined ? { assetType: input.assetType } : {}),
      ...(input.currency !== undefined
        ? { currency: input.currency.trim().toUpperCase() }
        : {}),
      ...(input.sellDate !== undefined ? { sellDate: input.sellDate } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.costBasis !== undefined ? { costBasis: input.costBasis } : {}),
      ...(input.proceeds !== undefined ? { proceeds: input.proceeds } : {}),
      ...(input.pnl !== undefined ? { pnl: input.pnl } : {}),
      ...(input.fee !== undefined ? { fee: input.fee } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .where(eq(realizedTrades.id, id))
    .returning()
    .get();
}

export function removeRealizedTrade(id: number): {
  removed: boolean;
  restored: boolean;
} {
  const trade = getRealizedTrade(id);
  if (!trade) return { removed: false, restored: false };

  const restored = sqlite.transaction(() => {
    if (trade.holdingId === null) {
      db.delete(realizedTrades).where(eq(realizedTrades.id, id)).run();
      return false;
    }

    const holding = getHolding(trade.holdingId);
    if (!holding) throw new Error("关联持仓已删除，无法撤销卖出");

    if (trade.cashCredited) {
      if (!trade.cashHoldingId) throw new Error("回款现金记录缺失，无法撤销");
      const cash = getHolding(trade.cashHoldingId);
      if (!cash) throw new Error("回款现金持仓已不存在，无法自动撤销");
      if (
        (cash.manualValue ?? cash.costBasis) + 1e-9 < trade.cashAmount ||
        cash.costBasis + 1e-9 < trade.cashAmount
      ) {
        throw new Error("回款现金已变动，无法自动撤销，请先手动调整现金");
      }
    }

    const now = new Date().toISOString();
    db.update(holdings)
      .set({
        quantity: holding.quantity + trade.quantity,
        costBasis: holding.costBasis + trade.costBasis,
        closedAt: null,
        updatedAt: now,
      })
      .where(eq(holdings.id, holding.id))
      .run();

    if (trade.cashCredited && trade.cashHoldingId) {
      const cash = getHolding(trade.cashHoldingId);
      if (cash) {
        const nextValue = (cash.manualValue ?? cash.costBasis) - trade.cashAmount;
        const nextCost = cash.costBasis - trade.cashAmount;
        if (trade.cashCreated && Math.abs(nextValue) < 1e-6) {
          db.delete(holdings).where(eq(holdings.id, cash.id)).run();
        } else {
          db.update(holdings)
            .set({ manualValue: nextValue, costBasis: nextCost, updatedAt: now })
            .where(eq(holdings.id, cash.id))
            .run();
        }
      }
    }

    db.delete(realizedTrades).where(eq(realizedTrades.id, id)).run();
    return true;
  })();

  if (restored) {
    try {
      snapshotToday();
    } catch {
      // 快照失败不影响卖出撤销，下一次同步会重新生成
    }
  }

  return { removed: true, restored };
}

export function sellHolding(input: SellInput): {
  trade: RealizedTrade;
  cashHoldingId: number | null;
  cashCreated: boolean;
} {
  const result = sqlite.transaction(() => {
    const holding = getHolding(input.holdingId);
    if (!holding || holding.closedAt !== null) throw new Error("持仓不存在或已清仓");
    if (holding.assetType === "cash") throw new Error("现金持仓不支持卖出");
    if (!(holding.quantity > 0)) throw new Error("持仓数量为 0");
    if (!(input.quantity > 0) || input.quantity > holding.quantity + 1e-9) {
      throw new Error("卖出数量不合法");
    }
    if (!(input.price >= 0)) throw new Error("卖出价不合法");
    if (!(input.fee >= 0)) throw new Error("手续费不合法");

    const allocation = computeSellAllocation({
      quantity: holding.quantity,
      costBasis: holding.costBasis,
      sellQuantity: input.quantity,
      price: input.price,
      fee: input.fee,
    });
    const now = new Date().toISOString();

    const inserted = db
      .insert(realizedTrades)
      .values({
        holdingId: holding.id,
        accountId: holding.accountId,
        categoryId: holding.categoryId,
        name: holding.name,
        symbol: holding.symbol,
        assetType: holding.assetType,
        currency: holding.currency,
        sellDate: input.sellDate,
        quantity: allocation.sellQuantity,
        costBasis: allocation.costOfSold,
        proceeds: allocation.gross,
        pnl: null,
        fee: input.fee,
        cashCredited: 0,
        cashHoldingId: null,
        cashAmount: 0,
        cashCreated: 0,
        note: "",
        createdAt: now,
      })
      .returning()
      .get();

    db.update(holdings)
      .set({
        quantity: allocation.remainingQuantity,
        costBasis: allocation.remainingCost,
        closedAt: allocation.isFull ? input.sellDate : null,
        updatedAt: now,
      })
      .where(eq(holdings.id, holding.id))
      .run();

    const shouldCredit = input.creditCash && allocation.netProceeds > 0;
    let cashHoldingId: number | null = null;
    let cashCreated = false;

    if (shouldCredit) {
      const existing = db
        .select()
        .from(holdings)
        .where(
          and(
            eq(holdings.accountId, holding.accountId),
            eq(holdings.currency, holding.currency),
            eq(holdings.assetType, "cash"),
            isNull(holdings.closedAt),
          ),
        )
        .orderBy(asc(holdings.id))
        .get();

      if (existing) {
        cashHoldingId = existing.id;
        db.update(holdings)
          .set({
            manualValue:
              (existing.manualValue ?? existing.costBasis) + allocation.netProceeds,
            costBasis: existing.costBasis + allocation.netProceeds,
            updatedAt: now,
          })
          .where(eq(holdings.id, existing.id))
          .run();
      } else {
        const created = db
          .insert(holdings)
          .values({
            accountId: holding.accountId,
            categoryId: null,
            name: "现金回款",
            symbol: "",
            assetType: "cash",
            market: "NONE",
            currency: holding.currency,
            quantity: 1,
            costBasis: allocation.netProceeds,
            manualValue: allocation.netProceeds,
            manualPrice: null,
            updatedAt: now,
          })
          .returning()
          .get();
        cashHoldingId = created.id;
        cashCreated = true;
      }
    }

    const trade = db
      .update(realizedTrades)
      .set({
        cashCredited: shouldCredit ? 1 : 0,
        cashHoldingId,
        cashAmount: shouldCredit ? allocation.netProceeds : 0,
        cashCreated: cashCreated ? 1 : 0,
      })
      .where(eq(realizedTrades.id, inserted.id))
      .returning()
      .get();

    return { trade, cashHoldingId, cashCreated };
  })();

  try {
    snapshotToday();
  } catch {
    // 快照失败不影响卖出结果，下一次同步会重新生成
  }

  return result;
}

export function getSetting(key: string): string | undefined {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value;
}

export function setSetting(key: string, value: string) {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function deleteSetting(key: string) {
  db.delete(settings).where(eq(settings.key, key)).run();
}

export function getBaseCurrency(): string {
  return getSetting("base_currency") ?? "CNY";
}

export type PriceRow = {
  symbol: string;
  market: string;
  date: string;
  close: number;
  prevClose: number | null;
  currency: string;
  name: string;
  source: string;
};

export function upsertPrice(p: PriceRow) {
  db.insert(prices)
    .values({ ...p, fetchedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [prices.symbol, prices.market, prices.date],
      set: {
        close: p.close,
        prevClose: p.prevClose,
        currency: p.currency,
        name: p.name,
        source: p.source,
        fetchedAt: new Date().toISOString(),
      },
    })
    .run();
}

export function latestPriceRows() {
  return sqlite
    .prepare(
      `SELECT p.* FROM prices p
       WHERE p.date = (SELECT MAX(date) FROM prices q WHERE q.symbol = p.symbol AND q.market = p.market)
       ORDER BY p.market, p.symbol`,
    )
    .all() as Array<{
    id: number;
    symbol: string;
    market: string;
    date: string;
    close: number;
    prev_close: number | null;
    currency: string;
    name: string;
    source: string;
    fetched_at: string;
  }>;
}

export function latestQuotes(): Map<string, Quote> {
  const rows = latestPriceRows();
  const map = new Map<string, Quote>();
  for (const row of rows) {
    map.set(quoteKey(row.market, row.symbol), {
      price: row.close,
      prevClose: row.prev_close,
      date: row.date,
      currency: row.currency,
    });
  }
  return map;
}

export function upsertFxRate(date: string, base: string, quote: string, rate: number) {
  db.insert(fxRates)
    .values({ date, base, quote, rate, fetchedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [fxRates.date, fxRates.base, fxRates.quote],
      set: { rate, fetchedAt: new Date().toISOString() },
    })
    .run();
}

export function latestFxPairs(): FxPair[] {
  const rows = sqlite
    .prepare(
      `SELECT f.base, f.quote, f.rate FROM fx_rates f
       WHERE f.date = (SELECT MAX(date) FROM fx_rates q WHERE q.base = f.base AND q.quote = f.quote)`,
    )
    .all() as Array<{ base: string; quote: string; rate: number }>;
  return rows;
}

export function latestFxRows() {
  return sqlite
    .prepare(
      `SELECT f.* FROM fx_rates f
       WHERE f.date = (SELECT MAX(date) FROM fx_rates q WHERE q.base = f.base AND q.quote = f.quote)
       ORDER BY f.base, f.quote`,
    )
    .all() as Array<{
    base: string;
    quote: string;
    rate: number;
    date: string;
    fetched_at: string;
  }>;
}

export type ValuationRow = {
  date: string;
  holdingId: number;
  price: number | null;
  fxRate: number;
  marketValue: number;
  cost: number;
  dayChange: number;
};

export function saveValuations(rows: ValuationRow[]) {
  const stmt = sqlite.prepare(
    `INSERT INTO valuations (date, holding_id, price, fx_rate, market_value, cost, day_change)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date, holding_id) DO UPDATE SET
       price = excluded.price,
       fx_rate = excluded.fx_rate,
       market_value = excluded.market_value,
       cost = excluded.cost,
       day_change = excluded.day_change`,
  );
  const tx = sqlite.transaction((items: ValuationRow[]) => {
    for (const r of items) {
      stmt.run(r.date, r.holdingId, r.price, r.fxRate, r.marketValue, r.cost, r.dayChange);
    }
  });
  tx(rows);
}

export type Portfolio = {
  accounts: Account[];
  categories: Category[];
  holdings: Holding[];
  valuations: HoldingValuation[];
  summary: Summary;
  baseCurrency: string;
  today: string;
};

export function localToday(timeZone = "Asia/Shanghai"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getPortfolio(
  baseCurrency = getBaseCurrency(),
  today = localToday(),
  accountId?: number,
  categoryId?: number | null,
): Portfolio {
  const accountRows = listAccounts();
  const holdingRows = listHoldings(accountId, categoryId);
  const quotes = latestQuotes();
  const fx = latestFxPairs();
  const valuations = valuateAll(
    holdingRows.map((h) => ({
      id: h.id,
      accountId: h.accountId,
      categoryId: h.categoryId,
      name: h.name,
      symbol: h.symbol,
      assetType: h.assetType,
      market: h.market,
      currency: h.currency,
      quantity: h.quantity,
      costBasis: h.costBasis,
      manualValue: h.manualValue,
      manualPrice: h.manualPrice,
    })),
    quotes,
    fx,
    baseCurrency,
    today,
  );

  return {
    accounts: accountRows,
    categories: listCategories(),
    holdings: holdingRows,
    valuations,
    summary: summarize(valuations),
    baseCurrency,
    today,
  };
}

export type HistoryPoint = {
  date: string;
  value: number;
  cost: number;
  pnl: number;
  dayChange: number;
};

export function getHistory(
  accountId?: number,
  categoryId?: number | null,
): HistoryPoint[] {
  const conditions: string[] = [];
  const params: number[] = [];
  if (accountId !== undefined) {
    conditions.push("h.account_id = ?");
    params.push(accountId);
  }
  if (categoryId !== undefined) {
    if (categoryId === null) {
      conditions.push("h.category_id IS NULL");
    } else {
      conditions.push("h.category_id = ?");
      params.push(categoryId);
    }
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = sqlite
    .prepare(
      `SELECT v.date, SUM(v.market_value) AS value, SUM(v.cost) AS cost,
              SUM(v.day_change) AS day_change
       FROM valuations v
       JOIN holdings h ON h.id = v.holding_id
       ${where}
       GROUP BY v.date ORDER BY v.date ASC`,
    )
    .all(...params) as Array<{
    date: string;
    value: number;
    cost: number;
    day_change: number;
  }>;
  return rows.map((r) => ({
    date: r.date,
    value: r.value,
    cost: r.cost,
    pnl: r.value - r.cost,
    dayChange: r.day_change,
  }));
}

export function snapshotToday(): number {
  const today = localToday();
  const portfolio = getPortfolio(getBaseCurrency(), today);
  saveValuations(
    portfolio.valuations.map((v) => ({
      date: today,
      holdingId: v.id,
      price: v.price,
      fxRate: v.fxRate,
      marketValue: v.marketValue,
      cost: v.cost,
      dayChange: v.dayChange,
    })),
  );
  sqlite
    .prepare(
      `DELETE FROM valuations
       WHERE date = ?
         AND holding_id IN (SELECT id FROM holdings WHERE closed_at IS NOT NULL)`,
    )
    .run(today);
  return portfolio.valuations.length;
}
