export function formatMoney(
  value: number,
  currency: string,
  digits = 0,
): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCompact(value: number, currency: string): string {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)} 亿`;
  }
  if (abs >= 10_000) {
    return `${(value / 10_000).toFixed(2)} 万`;
  }
  return formatMoney(value, currency, 0);
}

export function formatPct(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

export function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value, 2)}`;
}

export function toneClass(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value === 0) return "text-muted";
  return value > 0 ? "text-gain" : "text-loss";
}

export const ASSET_TYPE_OPTIONS = [
  { value: "cash", label: "现金" },
  { value: "deposit", label: "存款" },
  { value: "wealth", label: "理财" },
  { value: "fund", label: "基金" },
  { value: "stock", label: "股票" },
  { value: "gold", label: "黄金" },
  { value: "other", label: "其他" },
] as const;

export const MARKET_OPTIONS = [
  { value: "NONE", label: "非行情资产" },
  { value: "CN", label: "A 股" },
  { value: "FUND", label: "场外基金" },
  { value: "GOLD", label: "上海金" },
  { value: "HK", label: "港股" },
  { value: "US", label: "美股" },
] as const;

export const CURRENCY_OPTIONS = ["CNY", "USD", "HKD", "EUR", "GBP", "JPY", "SGD"];

export const PRICE_SOURCE_LABELS: Record<string, string> = {
  market: "行情",
  manual: "手动价",
  "manual-value": "手动市值",
  missing: "缺价",
};

export const GOLD_SYMBOL_OPTIONS = [
  { value: "AU9999", label: "AU9999 黄金9999" },
  { value: "AU9995", label: "AU9995 黄金9995" },
  { value: "AUTD", label: "AUTD 黄金T+D" },
] as const;

export const CATEGORY_COLORS = [
  "#5aa2ff",
  "#e0b25c",
  "#2fbf71",
  "#ff5c66",
  "#9b7bff",
  "#38bdf8",
  "#f472b6",
  "#a3e635",
];
