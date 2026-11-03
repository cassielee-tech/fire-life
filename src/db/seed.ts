import { sqlite } from "./index";
import { getPortfolio, localToday, saveValuations } from "./queries";
import type { AssetType, Market } from "../lib/valuation";

type Quote = {
  symbol: string;
  market: Market;
  currency: string;
  name: string;
  price: number;
  prevClose: number;
};

type DemoHolding = {
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
  quote?: Quote;
};

type DemoAccount = {
  id: number;
  name: string;
  institution: string;
  kind: "bank" | "broker" | "cash" | "other";
  currency: string;
  note: string;
};

type DemoCategory = {
  id: number;
  name: string;
  color: string;
};

const now = new Date();
const nowIso = now.toISOString();
const today = localToday();

const demoAccounts: DemoAccount[] = [
  {
    id: 1,
    name: "日常银行",
    institution: "示例银行",
    kind: "bank",
    currency: "CNY",
    note: "工资与日常收支",
  },
  {
    id: 2,
    name: "海外银行",
    institution: "示例海外银行",
    kind: "bank",
    currency: "USD",
    note: "美元资产",
  },
  {
    id: 3,
    name: "券商账户",
    institution: "示例证券",
    kind: "broker",
    currency: "CNY",
    note: "基金、ETF 与股票",
  },
  {
    id: 4,
    name: "互联网银行",
    institution: "示例互联网银行",
    kind: "bank",
    currency: "CNY",
    note: "存款与理财",
  },
  {
    id: 5,
    name: "现金钱包",
    institution: "",
    kind: "cash",
    currency: "CNY",
    note: "日常零钱与收藏",
  },
  {
    id: 6,
    name: "香港银行",
    institution: "示例香港银行",
    kind: "bank",
    currency: "HKD",
    note: "港股与港币",
  },
];

const demoCategories: DemoCategory[] = [
  { id: 1, name: "现金管理", color: "#5aa2ff" },
  { id: 2, name: "核心资产", color: "#2fbf71" },
  { id: 3, name: "卫星仓位", color: "#e0b25c" },
  { id: 4, name: "红利低波", color: "#9b7bff" },
  { id: 5, name: "海外配置", color: "#38bdf8" },
  { id: 6, name: "黄金", color: "#f59e0b" },
  { id: 7, name: "养老", color: "#f472b6" },
];

const cash = (
  id: number,
  accountId: number,
  categoryId: number | null,
  name: string,
  currency: string,
  amount: number,
): DemoHolding => ({
  id,
  accountId,
  categoryId,
  name,
  symbol: "",
  assetType: "cash",
  market: "NONE",
  currency,
  quantity: 1,
  costBasis: amount,
  manualValue: amount,
  manualPrice: null,
});

const demoHoldings: DemoHolding[] = [
  cash(1, 1, 1, "活期现金", "CNY", 120000),
  cash(2, 2, 5, "美元活期", "USD", 30000),
  cash(3, 6, 1, "港币活期", "HKD", 50000),
  cash(4, 5, null, "微信零钱", "CNY", 8000),
  {
    id: 5,
    accountId: 4,
    categoryId: 1,
    name: "三年定期",
    symbol: "",
    assetType: "deposit",
    market: "NONE",
    currency: "CNY",
    quantity: 1,
    costBasis: 200000,
    manualValue: 200000,
    manualPrice: null,
  },
  {
    id: 6,
    accountId: 4,
    categoryId: 1,
    name: "稳健理财",
    symbol: "",
    assetType: "wealth",
    market: "NONE",
    currency: "CNY",
    quantity: 150000,
    costBasis: 150000,
    manualValue: null,
    manualPrice: 1.05,
  },
  {
    id: 7,
    accountId: 4,
    categoryId: 1,
    name: "多月宝",
    symbol: "",
    assetType: "wealth",
    market: "NONE",
    currency: "CNY",
    quantity: 80000,
    costBasis: 80000,
    manualValue: null,
    manualPrice: 1.015,
  },
  {
    id: 8,
    accountId: 3,
    categoryId: 2,
    name: "华夏成长混合",
    symbol: "000001",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 100000,
    costBasis: 95000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "000001",
      market: "FUND",
      currency: "CNY",
      name: "华夏成长混合",
      price: 1.06,
      prevClose: 1.05,
    },
  },
  {
    id: 9,
    accountId: 3,
    categoryId: 2,
    name: "易方达中小盘",
    symbol: "110011",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 40000,
    costBasis: 75000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "110011",
      market: "FUND",
      currency: "CNY",
      name: "易方达中小盘",
      price: 2.1,
      prevClose: 2.08,
    },
  },
  {
    id: 10,
    accountId: 3,
    categoryId: 3,
    name: "招商中证白酒",
    symbol: "161725",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 50000,
    costBasis: 65000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "161725",
      market: "FUND",
      currency: "CNY",
      name: "招商中证白酒",
      price: 1.25,
      prevClose: 1.27,
    },
  },
  {
    id: 11,
    accountId: 3,
    categoryId: 4,
    name: "东方红红利",
    symbol: "012708",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 55000,
    costBasis: 70000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "012708",
      market: "FUND",
      currency: "CNY",
      name: "东方红红利",
      price: 1.32,
      prevClose: 1.3,
    },
  },
  {
    id: 12,
    accountId: 3,
    categoryId: 7,
    name: "纳斯达克100",
    symbol: "016452",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 22000,
    costBasis: 45000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "016452",
      market: "FUND",
      currency: "CNY",
      name: "纳斯达克100",
      price: 2.35,
      prevClose: 2.32,
    },
  },
  {
    id: 13,
    accountId: 3,
    categoryId: 2,
    name: "大成债券",
    symbol: "021131",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 48000,
    costBasis: 50000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "021131",
      market: "FUND",
      currency: "CNY",
      name: "大成债券",
      price: 1.08,
      prevClose: 1.079,
    },
  },
  {
    id: 14,
    accountId: 3,
    categoryId: 2,
    name: "沪深300ETF",
    symbol: "510300",
    assetType: "fund",
    market: "CN",
    currency: "CNY",
    quantity: 40000,
    costBasis: 140000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "510300",
      market: "CN",
      currency: "CNY",
      name: "沪深300ETF",
      price: 4.15,
      prevClose: 4.12,
    },
  },
  {
    id: 15,
    accountId: 3,
    categoryId: 6,
    name: "黄金ETF",
    symbol: "518880",
    assetType: "fund",
    market: "CN",
    currency: "CNY",
    quantity: 13000,
    costBasis: 72000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "518880",
      market: "CN",
      currency: "CNY",
      name: "黄金ETF",
      price: 6.45,
      prevClose: 6.4,
    },
  },
  {
    id: 16,
    accountId: 2,
    categoryId: 5,
    name: "苹果",
    symbol: "AAPL",
    assetType: "stock",
    market: "US",
    currency: "USD",
    quantity: 40,
    costBasis: 7000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "AAPL",
      market: "US",
      currency: "USD",
      name: "Apple",
      price: 230,
      prevClose: 228,
    },
  },
  {
    id: 17,
    accountId: 2,
    categoryId: 5,
    name: "微软",
    symbol: "MSFT",
    assetType: "stock",
    market: "US",
    currency: "USD",
    quantity: 20,
    costBasis: 6000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "MSFT",
      market: "US",
      currency: "USD",
      name: "Microsoft",
      price: 430,
      prevClose: 426,
    },
  },
  {
    id: 18,
    accountId: 2,
    categoryId: 5,
    name: "纳指100ETF",
    symbol: "QQQ",
    assetType: "stock",
    market: "US",
    currency: "USD",
    quantity: 30,
    costBasis: 12000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "QQQ",
      market: "US",
      currency: "USD",
      name: "Invesco QQQ",
      price: 520,
      prevClose: 515,
    },
  },
  {
    id: 19,
    accountId: 2,
    categoryId: 5,
    name: "标普500ETF",
    symbol: "VOO",
    assetType: "stock",
    market: "US",
    currency: "USD",
    quantity: 20,
    costBasis: 8000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "VOO",
      market: "US",
      currency: "USD",
      name: "Vanguard S&P 500",
      price: 540,
      prevClose: 536,
    },
  },
  {
    id: 20,
    accountId: 6,
    categoryId: 5,
    name: "腾讯控股",
    symbol: "00700",
    assetType: "stock",
    market: "HK",
    currency: "HKD",
    quantity: 300,
    costBasis: 90000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "00700",
      market: "HK",
      currency: "HKD",
      name: "腾讯控股",
      price: 400,
      prevClose: 396,
    },
  },
  {
    id: 21,
    accountId: 6,
    categoryId: 3,
    name: "阿里巴巴",
    symbol: "09988",
    assetType: "stock",
    market: "HK",
    currency: "HKD",
    quantity: 200,
    costBasis: 30000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "09988",
      market: "HK",
      currency: "HKD",
      name: "阿里巴巴",
      price: 120,
      prevClose: 122,
    },
  },
  {
    id: 22,
    accountId: 4,
    categoryId: 6,
    name: "黄金积存",
    symbol: "AU9999",
    assetType: "gold",
    market: "GOLD",
    currency: "CNY",
    quantity: 120,
    costBasis: 90000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "AU9999",
      market: "GOLD",
      currency: "CNY",
      name: "黄金9999",
      price: 850,
      prevClose: 845,
    },
  },
  {
    id: 23,
    accountId: 5,
    categoryId: 3,
    name: "艺术品收藏",
    symbol: "",
    assetType: "other",
    market: "NONE",
    currency: "CNY",
    quantity: 1,
    costBasis: 18000,
    manualValue: 20000,
    manualPrice: null,
  },
  {
    id: 24,
    accountId: 3,
    categoryId: 7,
    name: "养老目标基金",
    symbol: "017270",
    assetType: "fund",
    market: "FUND",
    currency: "CNY",
    quantity: 60000,
    costBasis: 60000,
    manualValue: null,
    manualPrice: null,
    quote: {
      symbol: "017270",
      market: "FUND",
      currency: "CNY",
      name: "养老目标基金",
      price: 1.05,
      prevClose: 1.045,
    },
  },
];

const fxRows: Array<{ base: string; quote: string; rate: number }> = [
  { base: "USD", quote: "CNY", rate: 7.1 },
  { base: "USD", quote: "HKD", rate: 7.8 },
  { base: "USD", quote: "EUR", rate: 0.92 },
  { base: "USD", quote: "GBP", rate: 0.79 },
  { base: "USD", quote: "JPY", rate: 150 },
  { base: "USD", quote: "SGD", rate: 1.35 },
];

const sellYear = today.slice(0, 4);
const currentMonth = Number(today.slice(5, 7));
const sellDate = (monthsAgo: number) => {
  const month = Math.max(1, currentMonth - monthsAgo);
  return `${sellYear}-${String(month).padStart(2, "0")}-15`;
};

const realizedRows = [
  {
    id: 1,
    accountId: 3,
    categoryId: 2,
    name: "宁德时代",
    symbol: "300750",
    assetType: "stock",
    currency: "CNY",
    sellDate: sellDate(1),
    quantity: 100,
    costBasis: 18000,
    proceeds: 24500,
    pnl: null,
    fee: 30,
    note: "演示数据：已清仓盈利",
  },
  {
    id: 2,
    accountId: 3,
    categoryId: 4,
    name: "白酒指数基金",
    symbol: "",
    assetType: "fund",
    currency: "CNY",
    sellDate: sellDate(4),
    quantity: 20000,
    costBasis: 12000,
    proceeds: 9800,
    pnl: null,
    fee: 15,
    note: "演示数据：已清仓亏损",
  },
  {
    id: 3,
    accountId: 2,
    categoryId: 5,
    name: "已清仓美股收益",
    symbol: "",
    assetType: "stock",
    currency: "CNY",
    sellDate: sellDate(6),
    quantity: 0,
    costBasis: 20000,
    proceeds: 0,
    pnl: 5200,
    fee: 0,
    note: "演示数据：直接填写收益",
  },
  {
    id: 4,
    accountId: 3,
    categoryId: 3,
    name: "光伏ETF",
    symbol: "515790",
    assetType: "fund",
    currency: "CNY",
    sellDate: sellDate(2),
    quantity: 15000,
    costBasis: 15000,
    proceeds: 16800,
    pnl: null,
    fee: 20,
    note: "演示数据：已清仓盈利",
  },
];

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function clearAll() {
  sqlite.exec(`
    DELETE FROM realized_trades;
    DELETE FROM valuations;
    DELETE FROM prices;
    DELETE FROM fx_rates;
    DELETE FROM holdings;
    DELETE FROM categories;
    DELETE FROM accounts;
    DELETE FROM settings;
    DELETE FROM sqlite_sequence;
  `);
}

function seed() {
  clearAll();

  const insertAccount = sqlite.prepare(
    `INSERT INTO accounts (id, name, institution, kind, currency, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const account of demoAccounts) {
    insertAccount.run(
      account.id,
      account.name,
      account.institution,
      account.kind,
      account.currency,
      account.note,
      nowIso,
    );
  }

  const insertCategory = sqlite.prepare(
    `INSERT INTO categories (id, name, color, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  for (const category of demoCategories) {
    insertCategory.run(category.id, category.name, category.color, nowIso);
  }

  const insertHolding = sqlite.prepare(
    `INSERT INTO holdings
      (id, account_id, category_id, name, symbol, asset_type, market, currency,
       quantity, cost_basis, manual_value, manual_price, closed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  );
  for (const holding of demoHoldings) {
    insertHolding.run(
      holding.id,
      holding.accountId,
      holding.categoryId,
      holding.name,
      holding.symbol,
      holding.assetType,
      holding.market,
      holding.currency,
      holding.quantity,
      holding.costBasis,
      holding.manualValue,
      holding.manualPrice,
      nowIso,
    );
  }

  const insertPrice = sqlite.prepare(
    `INSERT INTO prices
      (id, symbol, market, date, close, prev_close, currency, name, source, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let priceId = 1;
  for (const holding of demoHoldings) {
    if (!holding.quote) continue;
    insertPrice.run(
      priceId++,
      holding.quote.symbol,
      holding.quote.market,
      today,
      holding.quote.price,
      holding.quote.prevClose,
      holding.quote.currency,
      holding.quote.name,
      "demo",
      nowIso,
    );
  }

  const insertFx = sqlite.prepare(
    `INSERT INTO fx_rates (id, date, base, quote, rate, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  fxRows.forEach((row, index) => {
    insertFx.run(index + 1, today, row.base, row.quote, row.rate, nowIso);
  });

  const insertRealized = sqlite.prepare(
    `INSERT INTO realized_trades
      (id, holding_id, account_id, category_id, name, symbol, asset_type, currency,
       sell_date, quantity, cost_basis, proceeds, pnl, fee, cash_credited,
       cash_holding_id, cash_amount, cash_created, note, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, 0, ?, ?)`,
  );
  for (const row of realizedRows) {
    insertRealized.run(
      row.id,
      row.accountId,
      row.categoryId,
      row.name,
      row.symbol,
      row.assetType,
      row.currency,
      row.sellDate,
      row.quantity,
      row.costBasis,
      row.proceeds,
      row.pnl,
      row.fee,
      row.note,
      nowIso,
    );
  }

  sqlite
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
    .run("base_currency", "CNY");
}

seed();

const portfolio = getPortfolio("CNY", today);
const DAYS = 60;
const startDate = addDays(today, -(DAYS - 1));
const random = mulberry32(20261103);

const valuationRows: Parameters<typeof saveValuations>[0] = [];
for (const valuation of portfolio.valuations) {
  const volatility =
    valuation.assetType === "cash" || valuation.assetType === "deposit"
      ? 0.0002
      : valuation.assetType === "wealth"
        ? 0.0008
        : valuation.assetType === "other"
          ? 0.002
          : 0.012;

  let factor = 1;
  const factors: number[] = [];
  for (let day = 0; day < DAYS; day++) {
    factor *= 1 + (random() - 0.49) * volatility;
    factors.push(factor);
  }
  const lastFactor = factors[factors.length - 1];
  const normalized = factors.map((value) => value / lastFactor);

  for (let day = 0; day < DAYS; day++) {
    const date = addDays(startDate, day);
    const marketValue = valuation.marketValue * normalized[day];
    const previousValue =
      day === 0 ? marketValue : valuation.marketValue * normalized[day - 1];
    valuationRows.push({
      date,
      holdingId: valuation.id,
      price: valuation.price,
      fxRate: valuation.fxRate,
      marketValue,
      cost: valuation.cost,
      dayChange: marketValue - previousValue,
    });
  }
}
saveValuations(valuationRows);

const report = {
  startedAt: nowIso,
  finishedAt: nowIso,
  updated: demoHoldings
    .filter((holding) => holding.quote)
    .map((holding) => ({
      symbol: holding.quote!.symbol,
      market: holding.quote!.market,
      price: holding.quote!.price,
      date: today,
    })),
  failures: [],
  fx: { ok: true, count: fxRows.length, source: "demo" },
  snapshotCount: portfolio.valuations.length,
};
sqlite
  .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
  .run("last_sync", nowIso);
sqlite
  .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
  .run("last_sync_report", JSON.stringify(report));

console.log(
  `演示数据已生成：${demoAccounts.length} 个账户、${demoHoldings.length} 笔持仓、${realizedRows.length} 条收益记录`,
);
console.log(
  `总资产约 ¥${Math.round(portfolio.summary.totalValue).toLocaleString(
    "zh-CN",
  )}，历史快照 ${DAYS} 天`,
);

sqlite.close();
