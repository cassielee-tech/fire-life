import type { FxPair } from "./valuation";
import { makeFx } from "./valuation";

export type RealizedTradeLike = {
  currency: string;
  sellDate: string;
  costBasis: number;
  proceeds: number;
  pnl?: number | null;
  fee: number;
};

export type RealizedSummary = {
  pnl: number;
  cost: number;
  rate: number | null;
  count: number;
  missingFxCount: number;
};

export function realizedPnl(trade: {
  proceeds: number;
  fee: number;
  costBasis: number;
  pnl?: number | null;
}): number {
  if (trade.pnl !== null && trade.pnl !== undefined) return trade.pnl;
  return trade.proceeds - trade.fee - trade.costBasis;
}

export function computeSellAllocation(input: {
  quantity: number;
  costBasis: number;
  sellQuantity: number;
  price: number;
  fee: number;
}) {
  const quantity = Math.max(0, input.quantity);
  const sellQuantity = Math.min(Math.max(0, input.sellQuantity), quantity);
  const averageCost = quantity > 0 ? input.costBasis / quantity : 0;
  const isFull = quantity > 0 && quantity - sellQuantity <= 1e-9;
  const costOfSold = isFull ? input.costBasis : averageCost * sellQuantity;
  const gross = sellQuantity * input.price;
  const netProceeds = gross - input.fee;
  const pnl = netProceeds - costOfSold;
  const remainingQuantity = isFull ? 0 : quantity - sellQuantity;
  const remainingCost = isFull ? 0 : input.costBasis - costOfSold;

  return {
    sellQuantity,
    isFull,
    averageCost,
    costOfSold,
    gross,
    netProceeds,
    pnl,
    rate: costOfSold > 0 ? pnl / costOfSold : null,
    remainingQuantity,
    remainingCost,
  };
}

export function summarizeRealized(
  trades: RealizedTradeLike[],
  fx: ReturnType<typeof makeFx>,
  baseCurrency: string,
  year: string | null,
): RealizedSummary {
  let pnl = 0;
  let cost = 0;
  let count = 0;
  let missingFxCount = 0;

  for (const trade of trades) {
    if (year !== null && !trade.sellDate.startsWith(`${year}-`)) continue;
    const rate = fx(trade.currency, baseCurrency);
    if (rate === null) missingFxCount++;
    const effectiveRate = rate ?? 1;
    pnl += realizedPnl(trade) * effectiveRate;
    cost += trade.costBasis * effectiveRate;
    count++;
  }

  return {
    pnl,
    cost,
    rate: cost > 0 ? pnl / cost : null,
    count,
    missingFxCount,
  };
}

export function summarizeRealizedFromPairs(
  trades: RealizedTradeLike[],
  pairs: FxPair[],
  baseCurrency: string,
  year: string | null,
): RealizedSummary {
  return summarizeRealized(trades, makeFx(pairs), baseCurrency, year);
}
