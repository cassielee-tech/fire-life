export type AssetType = "cash" | "deposit" | "wealth" | "fund" | "stock" | "gold" | "other";
export type Market = "CN" | "HK" | "US" | "FUND" | "GOLD" | "NONE";

export type HoldingLike = {
  id: number;
  accountId: number;
  categoryId: number | null;
  name: string;
  symbol: string;
  assetType: AssetType;
  market: Market;
  currency: string;
  quantity: number;
  costBasis: number;
  manualValue: number | null;
  manualPrice: number | null;
};

export type Quote = {
  price: number;
  prevClose: number | null;
  date: string;
  currency: string;
};

export type FxPair = { base: string; quote: string; rate: number };

export type PriceSource = "market" | "manual" | "manual-value" | "missing";

export type HoldingValuation = {
  id: number;
  accountId: number;
  categoryId: number | null;
  name: string;
  symbol: string;
  assetType: AssetType;
  market: Market;
  currency: string;
  quantity: number;
  costBasis: number;
  costPrice: number | null;
  price: number | null;
  priceDate: string | null;
  priceSource: PriceSource;
  stale: boolean;
  fxRate: number;
  missingFx: boolean;
  marketValue: number;
  cost: number;
  pnl: number;
  pnlPct: number | null;
  dayChange: number;
  dayChangePct: number | null;
  weight: number;
};

export type Summary = {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number | null;
  dayChange: number;
  dayChangePct: number | null;
  missingPriceCount: number;
  stalePriceCount: number;
  missingFxCount: number;
};

export function quoteKey(market: string, symbol: string) {
  return `${market.trim().toUpperCase()}:${symbol.trim().toUpperCase()}`;
}

function businessDaysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return Number.POSITIVE_INFINITY;
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function isStale(
  date: string,
  today: string,
  assetType: AssetType,
): boolean {
  const tolerance = assetType === "fund" ? 2 : 1;
  return businessDaysBetween(date, today) > tolerance;
}

export function makeFx(rates: FxPair[]): (from: string, to: string) => number | null {
  const graph = new Map<string, Map<string, number>>();
  for (const { base, quote, rate } of rates) {
    if (!Number.isFinite(rate) || rate <= 0 || base === quote) continue;
    if (!graph.has(base)) graph.set(base, new Map());
    if (!graph.has(quote)) graph.set(quote, new Map());
    graph.get(base)!.set(quote, rate);
    graph.get(quote)!.set(base, 1 / rate);
  }

  return (from, to) => {
    if (from === to) return 1;
    const seen = new Set([from]);
    const queue: Array<{ currency: string; rate: number }> = [{ currency: from, rate: 1 }];
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const [next, edge] of graph.get(node.currency) ?? []) {
        if (seen.has(next)) continue;
        const rate = node.rate * edge;
        if (next === to) return rate;
        seen.add(next);
        queue.push({ currency: next, rate });
      }
    }
    return null;
  };
}

export function valuate(
  holding: HoldingLike,
  quotes: Map<string, Quote>,
  fx: (from: string, to: string) => number | null,
  baseCurrency: string,
  today: string,
): HoldingValuation {
  const quote = holding.symbol
    ? quotes.get(quoteKey(holding.market, holding.symbol))
    : undefined;

  const fxRate = fx(holding.currency, baseCurrency);
  const missingFx = fxRate === null;
  const effectiveFx = fxRate ?? 1;

  let price: number | null = null;
  let priceDate: string | null = null;
  let priceSource: PriceSource = "missing";
  let stale = false;
  let marketValueOriginal: number;

  if (holding.manualValue !== null && holding.manualValue !== undefined) {
    marketValueOriginal = holding.manualValue;
    priceSource = "manual-value";
  } else if (holding.manualPrice !== null && holding.manualPrice !== undefined) {
    price = holding.manualPrice;
    priceDate = today;
    priceSource = "manual";
    marketValueOriginal = holding.quantity * price;
  } else if (quote) {
    price = quote.price;
    priceDate = quote.date;
    priceSource = "market";
    stale = isStale(quote.date, today, holding.assetType);
    marketValueOriginal = holding.quantity * price;
  } else {
    marketValueOriginal = holding.costBasis;
  }

  const marketValue = marketValueOriginal * effectiveFx;
  const cost = holding.costBasis * effectiveFx;
  const pnl = marketValue - cost;

  let dayChange = 0;
  if (price !== null && quote?.prevClose != null && priceSource === "market") {
    dayChange = holding.quantity * (price - quote.prevClose) * effectiveFx;
  }
  const previousValue = marketValue - dayChange;

  return {
    id: holding.id,
    accountId: holding.accountId,
    categoryId: holding.categoryId,
    name: holding.name,
    symbol: holding.symbol,
    assetType: holding.assetType,
    market: holding.market,
    currency: holding.currency,
    quantity: holding.quantity,
    costBasis: holding.costBasis,
    costPrice: holding.quantity > 0 ? holding.costBasis / holding.quantity : null,
    price,
    priceDate,
    priceSource,
    stale,
    fxRate: effectiveFx,
    missingFx,
    marketValue,
    cost,
    pnl,
    pnlPct: cost > 0 ? pnl / cost : null,
    dayChange,
    dayChangePct: previousValue > 0 ? dayChange / previousValue : null,
    weight: 0,
  };
}

export function valuateAll(
  holdings: HoldingLike[],
  quotes: Map<string, Quote>,
  rates: FxPair[],
  baseCurrency: string,
  today: string,
): HoldingValuation[] {
  const fx = makeFx(rates);
  const result = holdings.map((h) => valuate(h, quotes, fx, baseCurrency, today));
  const total = result.reduce((sum, v) => sum + v.marketValue, 0);
  for (const v of result) {
    v.weight = total > 0 ? v.marketValue / total : 0;
  }
  return result;
}

export function summarize(valuations: HoldingValuation[]): Summary {
  const totalValue = valuations.reduce((s, v) => s + v.marketValue, 0);
  const totalCost = valuations.reduce((s, v) => s + v.cost, 0);
  const totalPnl = totalValue - totalCost;
  const dayChange = valuations.reduce((s, v) => s + v.dayChange, 0);
  const previousValue = totalValue - dayChange;

  return {
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct: totalCost > 0 ? totalPnl / totalCost : null,
    dayChange,
    dayChangePct: previousValue > 0 ? dayChange / previousValue : null,
    missingPriceCount: valuations.filter((v) => v.priceSource === "missing").length,
    stalePriceCount: valuations.filter((v) => v.stale).length,
    missingFxCount: valuations.filter((v) => v.missingFx).length,
  };
}

export type Allocation = {
  key: string;
  label: string;
  value: number;
  weight: number;
  color?: string | null;
};

const ASSET_LABELS: Record<AssetType, string> = {
  cash: "现金",
  deposit: "存款",
  wealth: "理财",
  fund: "基金",
  stock: "股票",
  gold: "黄金",
  other: "其他",
};

const MARKET_LABELS: Record<Market, string> = {
  CN: "A股/人民币",
  HK: "港股",
  US: "美股",
  FUND: "场外基金",
  GOLD: "上海金",
  NONE: "非行情资产",
};

export function allocate(
  valuations: HoldingValuation[],
  by: "assetType" | "currency" | "market" | "account",
  accountNames: Map<number, string>,
): Allocation[] {
  const buckets = new Map<string, { label: string; value: number }>();
  for (const v of valuations) {
    let key: string;
    let label: string;
    if (by === "assetType") {
      key = v.assetType;
      label = ASSET_LABELS[v.assetType];
    } else if (by === "currency") {
      key = v.currency;
      label = v.currency;
    } else if (by === "market") {
      key = v.market;
      label = MARKET_LABELS[v.market];
    } else {
      key = String(v.accountId);
      label = accountNames.get(v.accountId) ?? `账户 ${v.accountId}`;
    }
    const bucket = buckets.get(key) ?? { label, value: 0 };
    bucket.value += v.marketValue;
    buckets.set(key, bucket);
  }

  const total = valuations.reduce((s, v) => s + v.marketValue, 0);
  return [...buckets.entries()]
    .map(([key, b]) => ({
      key,
      label: b.label,
      value: b.value,
      weight: total > 0 ? b.value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export type CategoryInfo = {
  id: number;
  name: string;
  color: string;
};

export function allocateByCategory(
  valuations: HoldingValuation[],
  categories: CategoryInfo[],
): Allocation[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const buckets = new Map<string, { label: string; color: string; value: number }>();

  for (const v of valuations) {
    const category =
      v.categoryId === null ? undefined : byId.get(v.categoryId);
    const key = category ? `cat:${category.id}` : "uncategorized";
    const label = category?.name ?? "未分类";
    const color = category?.color ?? "#5b6675";
    const bucket = buckets.get(key) ?? { label, color, value: 0 };
    bucket.value += v.marketValue;
    buckets.set(key, bucket);
  }

  const total = valuations.reduce((s, v) => s + v.marketValue, 0);
  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      value: bucket.value,
      weight: total > 0 ? bucket.value / total : 0,
      color: bucket.color,
    }))
    .sort((a, b) => b.value - a.value);
}

export { ASSET_LABELS, MARKET_LABELS };
