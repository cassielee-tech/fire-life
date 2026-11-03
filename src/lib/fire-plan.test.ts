import { describe, expect, it } from "vitest";
import {
  buildFirePlan,
  firePlanInput,
  FIRE_PLAN_VERSION,
  parseFirePlan,
} from "./fire-plan";

const input = {
  currency: "cny",
  target: 3_000_000,
  income: 400_000,
  expense: 200_000,
  annualReturnPct: 6,
  considerInflation: false,
  inflationPct: 2.5,
  age: 32,
};

describe("firePlanInput", () => {
  it("normalizes currency and accepts valid input", () => {
    const parsed = firePlanInput.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("CNY");
      expect(parsed.data.age).toBe(32);
    }
  });

  it("requires a positive target and non-negative values", () => {
    expect(firePlanInput.safeParse({ ...input, target: 0 }).success).toBe(false);
    expect(firePlanInput.safeParse({ ...input, target: -1 }).success).toBe(false);
    expect(firePlanInput.safeParse({ ...input, expense: -1 }).success).toBe(false);
    expect(firePlanInput.safeParse({ ...input, annualReturnPct: -1 }).success).toBe(false);
  });

  it("defaults age to null", () => {
    const parsed = firePlanInput.safeParse({ ...input, age: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.age).toBeNull();
  });
});

describe("parseFirePlan", () => {
  it("parses a saved plan", () => {
    const plan = buildFirePlan({ ...firePlanInput.parse(input) });
    const parsed = parseFirePlan(JSON.stringify(plan));
    expect(parsed?.version).toBe(FIRE_PLAN_VERSION);
    expect(parsed?.target).toBe(3_000_000);
    expect(parsed?.currency).toBe("CNY");
  });

  it("returns null for invalid JSON or invalid plans", () => {
    expect(parseFirePlan("not json")).toBeNull();
    expect(parseFirePlan(null)).toBeNull();
    expect(
      parseFirePlan(JSON.stringify({ ...buildFirePlan(firePlanInput.parse(input)), version: 2 })),
    ).toBeNull();
    expect(parseFirePlan(JSON.stringify({ target: 3000000 }))).toBeNull();
  });
});
