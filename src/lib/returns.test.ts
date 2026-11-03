import { describe, expect, it } from "vitest";
import {
  computeSellAllocation,
  realizedPnl,
  summarizeRealized,
} from "./returns";
import { makeFx } from "./valuation";

const fxPairs = [
  { base: "USD", quote: "CNY", rate: 7 },
  { base: "USD", quote: "HKD", rate: 7.8 },
];

describe("computeSellAllocation", () => {
  it("handles a partial sell with a fee", () => {
    const result = computeSellAllocation({
      quantity: 100,
      costBasis: 1500,
      sellQuantity: 40,
      price: 20,
      fee: 2,
    });
    expect(result.costOfSold).toBe(600);
    expect(result.gross).toBe(800);
    expect(result.netProceeds).toBe(798);
    expect(result.pnl).toBe(198);
    expect(result.rate).toBeCloseTo(0.33);
    expect(result.remainingQuantity).toBe(60);
    expect(result.remainingCost).toBe(900);
    expect(result.isFull).toBe(false);
  });

  it("handles a full sell", () => {
    const result = computeSellAllocation({
      quantity: 100,
      costBasis: 1500,
      sellQuantity: 100,
      price: 20,
      fee: 2,
    });
    expect(result.costOfSold).toBe(1500);
    expect(result.pnl).toBe(498);
    expect(result.remainingQuantity).toBe(0);
    expect(result.remainingCost).toBe(0);
    expect(result.isFull).toBe(true);
  });

  it("clamps quantities and returns null rate for zero cost", () => {
    const result = computeSellAllocation({
      quantity: 10,
      costBasis: 0,
      sellQuantity: 99,
      price: 5,
      fee: 1,
    });
    expect(result.sellQuantity).toBe(10);
    expect(result.rate).toBeNull();
    expect(result.isFull).toBe(true);
  });

  it("includes fees in realized pnl", () => {
    expect(realizedPnl({ proceeds: 100, fee: 5, costBasis: 80 })).toBe(15);
  });

  it("prefers a directly entered pnl", () => {
    expect(
      realizedPnl({ proceeds: 0, fee: 0, costBasis: 0, pnl: 2500 }),
    ).toBe(2500);
    expect(
      realizedPnl({ proceeds: 1200, fee: 20, costBasis: 1000, pnl: 300 }),
    ).toBe(300);
  });
});

describe("summarizeRealized", () => {
  const trades = [
    { currency: "CNY", sellDate: "2026-03-01", costBasis: 1000, proceeds: 1200, fee: 20 },
    { currency: "CNY", sellDate: "2025-12-01", costBasis: 500, proceeds: 400, fee: 0 },
    { currency: "USD", sellDate: "2026-06-01", costBasis: 100, proceeds: 150, fee: 0 },
  ];

  it("filters by year and converts to the base currency", () => {
    const summary = summarizeRealized(trades, makeFx(fxPairs), "CNY", "2026");
    expect(summary.count).toBe(2);
    expect(summary.pnl).toBeCloseTo(180 + 350);
    expect(summary.cost).toBeCloseTo(1000 + 700);
    expect(summary.rate).toBeCloseTo(530 / 1700);
    expect(summary.missingFxCount).toBe(0);
  });

  it("aggregates all years when year is null", () => {
    const summary = summarizeRealized(trades, makeFx(fxPairs), "CNY", null);
    expect(summary.count).toBe(3);
    expect(summary.pnl).toBeCloseTo(430);
    expect(summary.cost).toBeCloseTo(2200);
  });

  it("flags missing fx and falls back to 1", () => {
    const summary = summarizeRealized(
      [
        {
          currency: "JPY",
          sellDate: "2026-01-01",
          costBasis: 100,
          proceeds: 120,
          fee: 0,
        },
      ],
      makeFx(fxPairs),
      "CNY",
      "2026",
    );
    expect(summary.missingFxCount).toBe(1);
    expect(summary.pnl).toBeCloseTo(20);
  });

  it("uses a directly entered pnl with optional cost", () => {
    const withCost = summarizeRealized(
      [
        {
          currency: "CNY",
          sellDate: "2026-02-01",
          costBasis: 10000,
          proceeds: 0,
          fee: 0,
          pnl: 2500,
        },
      ],
      makeFx(fxPairs),
      "CNY",
      "2026",
    );
    expect(withCost.pnl).toBe(2500);
    expect(withCost.cost).toBe(10000);
    expect(withCost.rate).toBeCloseTo(0.25);

    const withoutCost = summarizeRealized(
      [
        {
          currency: "CNY",
          sellDate: "2026-02-01",
          costBasis: 0,
          proceeds: 0,
          fee: 0,
          pnl: 2500,
        },
      ],
      makeFx(fxPairs),
      "CNY",
      "2026",
    );
    expect(withoutCost.pnl).toBe(2500);
    expect(withoutCost.rate).toBeNull();
  });

  it("returns a null rate when there is no realized cost", () => {
    const summary = summarizeRealized([], makeFx(fxPairs), "CNY", "2026");
    expect(summary.rate).toBeNull();
    expect(summary.count).toBe(0);
  });
});
