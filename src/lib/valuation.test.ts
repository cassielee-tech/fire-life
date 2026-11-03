import { describe, expect, it } from "vitest";
import {
  allocate,
  allocateByCategory,
  makeFx,
  quoteKey,
  summarize,
  valuate,
  valuateAll,
  type FxPair,
  type HoldingLike,
  type Quote,
} from "./valuation";

const today = "2026-11-02";

function holding(overrides: Partial<HoldingLike>): HoldingLike {
  return {
    id: 1,
    accountId: 1,
    categoryId: null,
    name: "test",
    symbol: "",
    assetType: "cash",
    market: "NONE",
    currency: "CNY",
    quantity: 0,
    costBasis: 0,
    manualValue: null,
    manualPrice: null,
    ...overrides,
  };
}

const rates: FxPair[] = [
  { base: "USD", quote: "CNY", rate: 7 },
  { base: "USD", quote: "HKD", rate: 7.8 },
];

describe("quoteKey", () => {
  it("normalizes case and whitespace", () => {
    expect(quoteKey(" us ", " qld ")).toBe(quoteKey("US", "QLD"));
  });
});

describe("makeFx", () => {
  it("returns 1 for same currency", () => {
    expect(makeFx(rates)("CNY", "CNY")).toBe(1);
  });

  it("uses direct and inverse rates", () => {
    const fx = makeFx(rates);
    expect(fx("USD", "CNY")).toBe(7);
    expect(fx("CNY", "USD")).toBeCloseTo(1 / 7);
  });

  it("triangulates cross rates", () => {
    const fx = makeFx(rates);
    expect(fx("HKD", "CNY")).toBeCloseTo(7 / 7.8);
    expect(fx("CNY", "HKD")).toBeCloseTo(7.8 / 7);
  });

  it("returns null for unknown currencies", () => {
    expect(makeFx(rates)("JPY", "CNY")).toBeNull();
  });
});

describe("valuate", () => {
  const fx = makeFx(rates);

  it("values cash at face value", () => {
    const v = valuate(
      holding({ quantity: 80000, costBasis: 80000, manualValue: 80000 }),
      new Map(),
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBe(80000);
    expect(v.pnl).toBe(0);
    expect(v.priceSource).toBe("manual-value");
    expect(v.dayChange).toBe(0);
  });

  it("values a fund quote and computes day change", () => {
    const quotes = new Map<string, Quote>([
      [
        quoteKey("CN", "510300"),
        { price: 4.2, prevClose: 4.1, date: today, currency: "CNY" },
      ],
    ]);
    const v = valuate(
      holding({
        symbol: "510300",
        assetType: "fund",
        market: "CN",
        quantity: 20000,
        costBasis: 72000,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBe(84000);
    expect(v.cost).toBe(72000);
    expect(v.costPrice).toBeCloseTo(3.6);
    expect(v.pnl).toBe(12000);
    expect(v.pnlPct).toBeCloseTo(12000 / 72000);
    expect(v.dayChange).toBeCloseTo(2000);
    expect(v.stale).toBe(false);
  });

  it("converts a US stock into the base currency", () => {
    const quotes = new Map<string, Quote>([
      [quoteKey("US", "AAPL"), { price: 200, prevClose: 198, date: today, currency: "USD" }],
    ]);
    const v = valuate(
      holding({
        symbol: "AAPL",
        assetType: "stock",
        market: "US",
        currency: "USD",
        quantity: 10,
        costBasis: 1800,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBeCloseTo(14000);
    expect(v.cost).toBeCloseTo(12600);
    expect(v.costPrice).toBeCloseTo(180);
    expect(v.pnl).toBeCloseTo(1400);
    expect(v.dayChange).toBeCloseTo(140);
  });

  it("falls back to cost when no price is available, and flags it", () => {
    const v = valuate(
      holding({ symbol: "999999", assetType: "stock", market: "CN", quantity: 100, costBasis: 5000 }),
      new Map(),
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBe(5000);
    expect(v.pnl).toBe(0);
    expect(v.priceSource).toBe("missing");
    expect(v.price).toBeNull();
  });

  it("matches a quote when the holding symbol uses a different case", () => {
    const quotes = new Map<string, Quote>([
      [
        quoteKey("US", "QLD"),
        { price: 82.59, prevClose: 82, date: today, currency: "USD" },
      ],
    ]);
    const v = valuate(
      holding({
        symbol: "qld",
        assetType: "stock",
        market: "US",
        currency: "USD",
        quantity: 82,
        costBasis: 7105.874,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.priceSource).toBe("market");
    expect(v.price).toBeCloseTo(82.59);
    expect(v.marketValue).toBeCloseTo(82 * 82.59 * 7);
    expect(v.costPrice).toBeCloseTo(7105.874 / 82);
  });

  it("values a wealth product by shares and current net value", () => {
    const v = valuate(
      holding({
        assetType: "wealth",
        quantity: 100000,
        costBasis: 150000,
        manualPrice: 1.532,
      }),
      new Map(),
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBeCloseTo(153200);
    expect(v.cost).toBe(150000);
    expect(v.costPrice).toBeCloseTo(1.5);
    expect(v.pnl).toBeCloseTo(3200);
    expect(v.priceSource).toBe("manual");
  });

  it("values gold by grams and the Shanghai gold quote", () => {
    const quotes = new Map<string, Quote>([
      [
        quoteKey("GOLD", "AU9999"),
        { price: 837.5, prevClose: 854.76, date: today, currency: "CNY" },
      ],
    ]);
    const v = valuate(
      holding({
        assetType: "gold",
        market: "GOLD",
        symbol: "AU9999",
        quantity: 100,
        costBasis: 50000,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBeCloseTo(83750);
    expect(v.cost).toBe(50000);
    expect(v.costPrice).toBeCloseTo(500);
    expect(v.pnl).toBeCloseTo(33750);
    expect(v.dayChange).toBeCloseTo(100 * (837.5 - 854.76));
    expect(v.priceSource).toBe("market");
  });

  it("allows a manual gold price override", () => {
    const quotes = new Map<string, Quote>([
      [
        quoteKey("GOLD", "AU9999"),
        { price: 837.5, prevClose: 854.76, date: today, currency: "CNY" },
      ],
    ]);
    const v = valuate(
      holding({
        assetType: "gold",
        market: "GOLD",
        symbol: "AU9999",
        quantity: 100,
        costBasis: 50000,
        manualPrice: 850,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBeCloseTo(85000);
    expect(v.priceSource).toBe("manual");
  });

  it("labels gold in the allocation breakdown", () => {
    const quotes = new Map<string, Quote>([
      [
        quoteKey("GOLD", "AU9999"),
        { price: 837.5, prevClose: 854.76, date: today, currency: "CNY" },
      ],
    ]);
    const v = valuate(
      holding({
        assetType: "gold",
        market: "GOLD",
        symbol: "AU9999",
        quantity: 100,
        costBasis: 50000,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    const allocations = allocate([v], "assetType", new Map());
    expect(allocations[0]).toMatchObject({ key: "gold", label: "黄金" });
  });

  it("marks a quote from an earlier day as stale", () => {
    const quotes = new Map<string, Quote>([
      [quoteKey("CN", "600519"), { price: 1500, prevClose: 1490, date: "2026-10-28", currency: "CNY" }],
    ]);
    const v = valuate(
      holding({
        symbol: "600519",
        assetType: "stock",
        market: "CN",
        quantity: 10,
        costBasis: 14000,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.stale).toBe(true);
    expect(v.priceDate).toBe("2026-10-28");
  });

  it("prefers a manual price override", () => {
    const quotes = new Map<string, Quote>([
      [quoteKey("CN", "600519"), { price: 1500, prevClose: 1490, date: today, currency: "CNY" }],
    ]);
    const v = valuate(
      holding({
        symbol: "600519",
        assetType: "stock",
        market: "CN",
        quantity: 10,
        costBasis: 14000,
        manualPrice: 1600,
      }),
      quotes,
      fx,
      "CNY",
      today,
    );
    expect(v.marketValue).toBe(16000);
    expect(v.priceSource).toBe("manual");
  });

  it("flags missing fx and falls back to 1", () => {
    const v = valuate(
      holding({ currency: "JPY", quantity: 100, costBasis: 100 }),
      new Map(),
      fx,
      "CNY",
      today,
    );
    expect(v.missingFx).toBe(true);
    expect(v.fxRate).toBe(1);
    expect(v.marketValue).toBe(100);
  });
});

describe("portfolio aggregation", () => {
  const quotes = new Map<string, Quote>([
    [quoteKey("US", "AAPL"), { price: 200, prevClose: 198, date: today, currency: "USD" }],
    [quoteKey("CN", "510300"), { price: 4.2, prevClose: 4.1, date: today, currency: "CNY" }],
  ]);

  const holdings: HoldingLike[] = [
    holding({ id: 1, quantity: 80000, costBasis: 80000, manualValue: 80000 }),
    holding({
      id: 2,
      symbol: "510300",
      assetType: "fund",
      market: "CN",
      quantity: 20000,
      costBasis: 72000,
    }),
    holding({
      id: 3,
      symbol: "AAPL",
      assetType: "stock",
      market: "US",
      currency: "USD",
      quantity: 10,
      costBasis: 1800,
    }),
  ];

  it("computes weights and totals", () => {
    const valuations = valuateAll(holdings, quotes, rates, "CNY", today);
    const total = 80000 + 84000 + 14000;
    expect(valuations[0].weight).toBeCloseTo(80000 / total);
    expect(valuations[2].weight).toBeCloseTo(14000 / total);

    const summary = summarize(valuations);
    expect(summary.totalValue).toBeCloseTo(total);
    expect(summary.totalCost).toBeCloseTo(80000 + 72000 + 12600);
    expect(summary.dayChange).toBeCloseTo(2000 + 140);
    expect(summary.missingPriceCount).toBe(0);
  });

  it("groups allocation by asset type", () => {
    const valuations = valuateAll(holdings, quotes, rates, "CNY", today);
    const allocations = allocate(valuations, "assetType", new Map());
    const cash = allocations.find((a) => a.key === "cash");
    expect(cash?.value).toBe(80000);
    expect(allocations[0].value).toBe(84000);
  });
});

describe("allocateByCategory", () => {
  const categories = [
    { id: 1, name: "核心资产", color: "#5aa2ff" },
    { id: 2, name: "卫星", color: "#e0b25c" },
  ];
  const holdings: HoldingLike[] = [
    holding({ id: 1, quantity: 100, costBasis: 100, manualValue: 100, categoryId: 1 }),
    holding({ id: 2, quantity: 200, costBasis: 200, manualValue: 200, categoryId: 2 }),
    holding({ id: 3, quantity: 300, costBasis: 300, manualValue: 300, categoryId: null }),
  ];

  it("groups values by category and keeps uncategorized separate", () => {
    const valuations = valuateAll(holdings, new Map(), rates, "CNY", today);
    const allocations = allocateByCategory(valuations, categories);

    expect(allocations.find((a) => a.key === "cat:1")?.value).toBe(100);
    expect(allocations.find((a) => a.key === "cat:2")?.value).toBe(200);

    const uncategorized = allocations.find((a) => a.key === "uncategorized");
    expect(uncategorized?.value).toBe(300);
    expect(uncategorized?.label).toBe("未分类");
    expect(uncategorized?.color).toBe("#5b6675");

    const weight = allocations.reduce((sum, item) => sum + item.weight, 0);
    expect(weight).toBeCloseTo(1);
  });
});
