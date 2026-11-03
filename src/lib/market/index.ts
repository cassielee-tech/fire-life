import type { FetchResult } from "./eastmoney";
import { fetchEastmoneyQuote } from "./eastmoney";
import { fetchFundNav } from "./fund";
import { fetchTencentQuote } from "./tencent";

type FetchableHolding = {
  market: string;
  symbol: string;
};

export async function fetchQuoteForHolding(holding: FetchableHolding): Promise<FetchResult> {
  const market = holding.market;
  const symbol = holding.symbol.trim();
  if (!symbol) return { ok: false, error: "缺少代码" };

  if (market === "FUND") return fetchFundNav(symbol);

  if (market === "GOLD") {
    const result = await fetchEastmoneyQuote("GOLD", symbol);
    if (result.ok) return result;
    return {
      ok: false,
      error: `${result.error}（上海金暂无备用行情源，可填写手动金价）`,
    };
  }

  if (market === "CN" || market === "HK" || market === "US") {
    const primary = await fetchTencentQuote(market, symbol);
    if (primary.ok) return primary;
    const fallback = await fetchEastmoneyQuote(market, symbol);
    if (fallback.ok) return fallback;
    return { ok: false, error: `${primary.error}；备用源：${fallback.error}` };
  }

  return { ok: false, error: "非行情资产无需抓取" };
}

export { fetchEastmoneyQuote } from "./eastmoney";
export { fetchFundNav } from "./fund";
export { fetchTencentQuote } from "./tencent";
export { fetchFxRates } from "./fx";
export type { FetchResult, MarketQuote } from "./eastmoney";
