import type { FetchResult } from "./eastmoney";

type FundHistory = {
  Data?: {
    LSJZList?: Array<{ FSRQ: string; DWJZ: string }>;
  };
};

export async function fetchFundNav(symbol: string): Promise<FetchResult> {
  const code = symbol.trim().replace(/\D/g, "");
  if (!code) return { ok: false, error: "基金代码为空" };

  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=2`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        Referer: "https://fundf10.eastmoney.com/",
      },
    });
    if (!res.ok) return { ok: false, error: `天天基金 HTTP ${res.status}` };
    const payload = (await res.json()) as FundHistory;
    const list = payload.Data?.LSJZList ?? [];
    const latest = list[0];
    if (!latest) return { ok: false, error: "基金代码无净值数据" };

    const price = Number(latest.DWJZ);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, error: "基金净值解析失败" };
    }
    const prev = list[1] ? Number(list[1].DWJZ) : null;

    return {
      ok: true,
      quote: {
        symbol: code,
        market: "FUND",
        price,
        prevClose: prev && Number.isFinite(prev) ? prev : null,
        date: latest.FSRQ,
        currency: "CNY",
        name: "",
        source: "eastmoney-fund",
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
