export type FxSnapshot = {
  date: string;
  rates: Array<{ base: string; quote: string; rate: number }>;
  source: string;
};

const SYMBOLS = ["CNY", "HKD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "CHF"];

type FrankfurterPayload = {
  date: string;
  base: string;
  rates: Record<string, number>;
};

type ErApiPayload = {
  result: string;
  time_last_update_utc?: string;
  rates: Record<string, number>;
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchFxRates(): Promise<FxSnapshot> {
  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${SYMBOLS.join(",")}`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
    const payload = (await res.json()) as FrankfurterPayload;
    const rates = Object.entries(payload.rates)
      .filter(([, rate]) => Number.isFinite(rate) && rate > 0)
      .map(([quote, rate]) => ({ base: "USD", quote, rate }));
    if (rates.length > 0) {
      return { date: payload.date ?? todayUtc(), rates, source: "frankfurter" };
    }
    throw new Error("frankfurter 返回空汇率");
  } catch {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`汇率接口 HTTP ${res.status}`);
    const payload = (await res.json()) as ErApiPayload;
    const rates = SYMBOLS.filter((c) => c !== "USD")
      .map((quote) => ({ base: "USD", quote, rate: payload.rates[quote] }))
      .filter((r) => Number.isFinite(r.rate) && r.rate > 0);
    if (rates.length === 0) throw new Error("汇率接口返回空数据");
    return { date: todayUtc(), rates, source: "er-api" };
  }
}
