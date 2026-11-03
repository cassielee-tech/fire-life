import { listHoldings, setSetting, snapshotToday, upsertFxRate, upsertPrice } from "@/db/queries";
import { fetchFxRates, fetchQuoteForHolding } from "@/lib/market";

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker()),
  );
  return results;
}

function isTransient(error: string) {
  return /fetch failed|timeout|timed out|HTTP 5\d\d|ECONN|socket/i.test(error);
}

async function fetchWithRetry(
  holding: { market: string; symbol: string },
  attempts = 2,
): Promise<Awaited<ReturnType<typeof fetchQuoteForHolding>>> {
  let result = await fetchQuoteForHolding(holding);
  for (let i = 1; i < attempts && !result.ok && isTransient(result.error); i++) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    result = await fetchQuoteForHolding(holding);
  }
  return result;
}

export type SyncFailure = {
  holdingId: number;
  name: string;
  symbol: string;
  market: string;
  error: string;
};

export type SyncReport = {
  startedAt: string;
  finishedAt: string;
  updated: Array<{ symbol: string; market: string; price: number; date: string }>;
  failures: SyncFailure[];
  fx: { ok: boolean; count: number; source?: string; error?: string };
  snapshotCount: number;
  fxUpdateError?: string;
};

export async function runSync(): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const all = listHoldings();
  const quoted = all.filter((h) => h.symbol.trim() !== "" && h.market !== "NONE");

  const unique = new Map<string, (typeof quoted)[number]>();
  for (const h of quoted) {
    unique.set(`${h.market}:${h.symbol.trim().toUpperCase()}`, h);
  }

  const failures: SyncFailure[] = [];
  const updated: SyncReport["updated"] = [];

  const quotes = await mapLimit(
    [...unique.values()],
    3,
    (h) => fetchWithRetry({ market: h.market, symbol: h.symbol }),
  );

  [...unique.values()].forEach((h, index) => {
    const result = quotes[index];
    if (!result.ok) {
      failures.push({
        holdingId: h.id,
        name: h.name,
        symbol: h.symbol,
        market: h.market,
        error: result.error,
      });
      return;
    }
    const q = result.quote;
    upsertPrice({
      symbol: q.symbol,
      market: q.market,
      date: q.date,
      close: q.price,
      prevClose: q.prevClose,
      currency: q.currency,
      name: q.name,
      source: q.source,
    });
    updated.push({ symbol: q.symbol, market: q.market, price: q.price, date: q.date });
  });

  let fx: SyncReport["fx"] = { ok: false, count: 0 };
  try {
    const snapshot = await fetchFxRates();
    for (const rate of snapshot.rates) {
      upsertFxRate(snapshot.date, rate.base, rate.quote, rate.rate);
    }
    fx = { ok: true, count: snapshot.rates.length, source: snapshot.source };
  } catch (err) {
    fx = { ok: false, count: 0, error: err instanceof Error ? err.message : String(err) };
  }

  const snapshotCount = snapshotToday();
  const finishedAt = new Date().toISOString();

  setSetting("last_sync", finishedAt);
  setSetting(
    "last_sync_report",
    JSON.stringify({ updated, failures, fx, snapshotCount, startedAt, finishedAt }),
  );

  return { startedAt, finishedAt, updated, failures, fx, snapshotCount };
}
