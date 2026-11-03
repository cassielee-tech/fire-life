import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildFireScenarios,
  calculateFire,
  type FireInput,
} from "./fire";

const base: FireInput = {
  currentAssets: 0,
  targetAmount: 1_200_000,
  annualSavings: 120_000,
  annualReturn: 0,
  inflation: 0,
  considerInflation: false,
  currentAge: null,
};

describe("calculateFire", () => {
  it("computes months for a zero-return plan", () => {
    const result = calculateFire(base);
    expect(result.reached).toBe(true);
    expect(result.months).toBe(120);
    expect(result.finalBalance).toBeCloseTo(1_200_000);
    expect(result.totalContributions).toBeCloseTo(1_200_000);
    expect(result.totalGrowth).toBeCloseTo(0);
    expect(result.points[0].year).toBe(0);
    expect(result.points.at(-1)?.year).toBe(10);
  });

  it("compounds existing assets without contributions", () => {
    const result = calculateFire({
      ...base,
      currentAssets: 100_000,
      targetAmount: 200_000,
      annualSavings: 0,
      annualReturn: 0.07,
    });
    expect(result.reached).toBe(true);
    expect(result.months).toBeGreaterThan(118);
    expect(result.months).toBeLessThan(128);
    expect(result.finalBalance).toBeGreaterThanOrEqual(200_000);
    expect(result.totalContributions).toBe(0);
  });

  it("returns already_reached when the target is met", () => {
    const result = calculateFire({
      ...base,
      currentAssets: 1_200_000,
    });
    expect(result.reason).toBe("already_reached");
    expect(result.months).toBe(0);
    expect(result.progress).toBe(1);
    expect(result.points).toHaveLength(1);
  });

  it("flags a plan with no savings and no growth", () => {
    const result = calculateFire({
      ...base,
      currentAssets: 100_000,
      targetAmount: 200_000,
      annualSavings: 0,
    });
    expect(result.reached).toBe(false);
    expect(result.reason).toBe("no_savings_no_growth");
    expect(result.months).toBeNull();
  });

  it("uses real return when inflation is enabled", () => {
    const withoutInflation = calculateFire({
      ...base,
      annualReturn: 0.08,
    });
    const withInflation = calculateFire({
      ...base,
      annualReturn: 0.08,
      inflation: 0.03,
      considerInflation: true,
    });
    expect(withInflation.effectiveAnnualReturn).toBeCloseTo(1.08 / 1.03 - 1);
    expect(withInflation.months).not.toBeNull();
    expect(withoutInflation.months).not.toBeNull();
    expect(withInflation.months!).toBeGreaterThan(withoutInflation.months!);
  });

  it("keeps progress based on current assets", () => {
    const result = calculateFire({
      ...base,
      currentAssets: 300_000,
      targetAmount: 1_200_000,
    });
    expect(result.reached).toBe(true);
    expect(result.progress).toBeCloseTo(0.25);
  });

  it("tracks age when provided", () => {
    const result = calculateFire({ ...base, currentAge: 30 });
    expect(result.ageAtFire).toBeCloseTo(40);
    expect(result.points.at(-1)?.age).toBeCloseTo(40);
  });
});

describe("buildFireScenarios", () => {
  it("returns five scenarios with a consistent base", () => {
    const scenarios = buildFireScenarios(base);
    expect(scenarios).toHaveLength(5);
    const baseScenario = scenarios.find((scenario) => scenario.key === "base");
    expect(baseScenario?.result.months).toBe(calculateFire(base).months);
  });
});

describe("addMonths", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-11-02", 3)).toBe("2027-02-02");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("clamps the day to the end of the target month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});
