import { describe, expect, it } from "vitest";
import { toCostBasis, toCostPrice } from "./cost";

describe("toCostBasis", () => {
  it("multiplies shares and cost price", () => {
    expect(toCostBasis(20000, 3.6)).toBe(72000);
  });

  it("rounds floating point noise", () => {
    expect(toCostBasis(3, 1.1)).toBe(3.3);
    expect(toCostBasis(0.1, 0.2)).toBe(0.02);
  });

  it("returns 0 for invalid input", () => {
    expect(toCostBasis(Number.NaN, 10)).toBe(0);
    expect(toCostBasis(10, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("toCostPrice", () => {
  it("derives the unit cost", () => {
    expect(toCostPrice(72000, 20000)).toBe(3.6);
  });

  it("returns null when quantity is zero or negative", () => {
    expect(toCostPrice(72000, 0)).toBeNull();
    expect(toCostPrice(72000, -1)).toBeNull();
  });
});
