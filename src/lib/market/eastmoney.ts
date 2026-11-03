import type { Market } from "@/lib/valuation";

export type MarketQuote = {
  symbol: string;
  market: Market;
  price: number;
  prevClose: number | null;
  date: string;
  currency: string;
  name: string;
  source: string;
};

export type FetchResult =
  | { ok: true; quote: MarketQuote }
  | { ok: false; error: string };

type EastmoneyPayload = {
  data?: {
    f43?: number;
    f57?: string;
    f58?: string;
    f59?: number;
    f60?: number;
    f86?: number;
  } | null;
};

const US_MARKET_IDS = [105, 106, 107];

function secids(market: Market, symbol: string): string[] {
  const s = symbol.trim().toUpperCase().replace(/^(SH|SZ|HK|US)\./, "");
  if (!s) return [];
  if (market === "CN") {
    if (/^[659]/.test(s)) return [`1.${s}`];
    if (/^[0132]/.test(s)) return [`0.${s}`];
    return [`1.${s}`, `0.${s}`];
  }
  if (market === "HK") return [`116.${s.padStart(5, "0")}`];
  if (market === "US") return US_MARKET_IDS.map((id) => `${id}.${s}`);
  if (market === "GOLD") {
    return ["AU9999", "AU9995", "AUTD"].includes(s) ? [`118.${s}`] : [];
  }
  return [];
}

function marketCurrency(market: Market): string {
  if (market === "US") return "USD";
  if (market === "HK") return "HKD";
  return "CNY";
}

function tradeDate(epochSeconds: number, market: Market): string {
  const timeZone =
    market === "US" ? "America/New_York" : market === "HK" ? "Asia/Hong_Kong" : "Asia/Shanghai";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(epochSeconds * 1000));
}

async function fetchOne(secid: string, market: Market): Promise<MarketQuote | null> {
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f59,f60,f86`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      Referer: "https://quote.eastmoney.com/",
    },
  });
  if (!res.ok) throw new Error(`东方财富 HTTP ${res.status}`);
  const payload = (await res.json()) as EastmoneyPayload;
  const data = payload.data;
  if (!data?.f43 || data.f43 <= 0) return null;

  const scale = 10 ** (data.f59 ?? 2);
  const price = data.f43 / scale;
  const prevClose = data.f60 ? data.f60 / scale : null;
  const epoch = data.f86 ?? Math.floor(Date.now() / 1000);

  return {
    symbol: data.f57 ?? secid.split(".")[1],
    market,
    price,
    prevClose,
    date: tradeDate(epoch, market),
    currency: marketCurrency(market),
    name: data.f58 ?? "",
    source: "eastmoney",
  };
}

export async function fetchEastmoneyQuote(
  market: Market,
  symbol: string,
): Promise<FetchResult> {
  const candidates = secids(market, symbol);
  if (candidates.length === 0) {
    return { ok: false, error: "该市场暂不支持行情抓取" };
  }

  let lastError = "未获取到行情";
  for (const secid of candidates) {
    try {
      const quote = await fetchOne(secid, market);
      if (quote) return { ok: true, quote };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, error: `${symbol} ${lastError}` };
}
