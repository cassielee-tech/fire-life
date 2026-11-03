import type { Market } from "@/lib/valuation";
import type { FetchResult } from "./eastmoney";

function tencentCode(market: Market, symbol: string): string | null {
  const s = symbol.trim().toUpperCase().replace(/^(SH|SZ|HK|US)\./, "");
  if (!s) return null;
  if (market === "CN") return `${/^[659]/.test(s) ? "sh" : "sz"}${s}`;
  if (market === "HK") return `hk${s.padStart(5, "0")}`;
  if (market === "US") return `us${s.split(".")[0]}`;
  return null;
}

function marketCurrency(market: Market): string {
  return market === "US" ? "USD" : market === "HK" ? "HKD" : "CNY";
}

function normalizeDate(fields: string[], market: Market): string {
  for (const field of fields) {
    const compact = field.match(/^(\d{4})(\d{2})(\d{2})\d{6}$/);
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
    const spaced = field.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
    if (spaced) return `${spaced[1]}-${spaced[2]}-${spaced[3]}`;
  }
  const timeZone =
    market === "US" ? "America/New_York" : market === "HK" ? "Asia/Hong_Kong" : "Asia/Shanghai";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function fetchTencentQuote(
  market: Market,
  symbol: string,
): Promise<FetchResult> {
  const code = tencentCode(market, symbol);
  if (!code) return { ok: false, error: "该市场暂不支持行情抓取" };

  try {
    const res = await fetch(`https://qt.gtimg.cn/q=${code}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        Referer: "https://finance.qq.com/",
      },
    });
    if (!res.ok) return { ok: false, error: `腾讯行情 HTTP ${res.status}` };

    const text = new TextDecoder("gbk").decode(await res.arrayBuffer());
    const match = text.match(/="([^"]*)"/);
    if (!match) return { ok: false, error: "腾讯行情返回为空" };

    const fields = match[1].split("~");
    const price = Number(fields[3]);
    const prevClose = Number(fields[4]);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, error: "腾讯行情价格解析失败" };
    }

    return {
      ok: true,
      quote: {
        symbol: (fields[2] ?? symbol).split(".")[0],
        market,
        price,
        prevClose: Number.isFinite(prevClose) && prevClose > 0 ? prevClose : null,
        date: normalizeDate(fields, market),
        currency: marketCurrency(market),
        name: fields[1] ?? "",
        source: "tencent",
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
