export type FireInput = {
  currentAssets: number;
  targetAmount: number;
  annualSavings: number;
  annualReturn: number;
  inflation: number;
  considerInflation: boolean;
  currentAge?: number | null;
};

export type FirePoint = {
  year: number;
  age: number | null;
  balance: number;
  contributions: number;
  growth: number;
  progress: number;
};

export type FireReason =
  | "reached"
  | "already_reached"
  | "no_savings_no_growth"
  | "timeout";

export type FireResult = {
  reached: boolean;
  reason: FireReason;
  months: number | null;
  monthlyContribution: number;
  effectiveAnnualReturn: number;
  finalBalance: number;
  totalContributions: number;
  totalGrowth: number;
  progress: number;
  ageAtFire: number | null;
  points: FirePoint[];
};

export const FIRE_MAX_YEARS = 60;

function monthlyRateFromAnnual(annual: number): number {
  const safe = Math.max(-0.99, annual);
  return Math.pow(1 + safe, 1 / 12) - 1;
}

export function calculateFire(input: FireInput): FireResult {
  const target = Math.max(0, input.targetAmount);
  const currentAssets = Math.max(0, input.currentAssets);
  const annualSavings = Math.max(0, input.annualSavings);
  const monthlyContribution = annualSavings / 12;
  const inflation = Math.max(0, input.inflation);

  const effectiveAnnualReturn = input.considerInflation
    ? (1 + input.annualReturn) / (1 + inflation) - 1
    : input.annualReturn;
  const monthlyRate = monthlyRateFromAnnual(effectiveAnnualReturn);

  const progress = target > 0 ? Math.min(currentAssets / target, 1) : 1;
  const initial: FirePoint = {
    year: 0,
    age: input.currentAge ?? null,
    balance: currentAssets,
    contributions: 0,
    growth: 0,
    progress,
  };

  if (target <= 0 || currentAssets >= target) {
    return {
      reached: true,
      reason: "already_reached",
      months: 0,
      monthlyContribution,
      effectiveAnnualReturn,
      finalBalance: currentAssets,
      totalContributions: 0,
      totalGrowth: 0,
      progress: 1,
      ageAtFire: input.currentAge ?? null,
      points: [initial],
    };
  }

  if (annualSavings <= 0 && monthlyRate <= 0) {
    return {
      reached: false,
      reason: "no_savings_no_growth",
      months: null,
      monthlyContribution,
      effectiveAnnualReturn,
      finalBalance: currentAssets,
      totalContributions: 0,
      totalGrowth: 0,
      progress,
      ageAtFire: null,
      points: [initial],
    };
  }

  let balance = currentAssets;
  let contributions = 0;
  let months: number | null = null;
  let reason: FireReason = "timeout";
  const points: FirePoint[] = [initial];
  const maxMonths = FIRE_MAX_YEARS * 12;

  for (let month = 1; month <= maxMonths; month++) {
    balance += balance * monthlyRate;
    balance += monthlyContribution;
    contributions += monthlyContribution;

    const reached = balance >= target;
    const atYearEnd = month % 12 === 0;

    if (atYearEnd || reached) {
      points.push({
        year: month / 12,
        age: input.currentAge ? input.currentAge + month / 12 : null,
        balance,
        contributions,
        growth: balance - currentAssets - contributions,
        progress: target > 0 ? Math.min(balance / target, 1) : 1,
      });
    }

    if (reached) {
      months = month;
      reason = "reached";
      break;
    }
  }

  return {
    reached: months !== null,
    reason,
    months,
    monthlyContribution,
    effectiveAnnualReturn,
    finalBalance: balance,
    totalContributions: contributions,
    totalGrowth: balance - currentAssets - contributions,
    progress,
    ageAtFire:
      months !== null && input.currentAge
        ? input.currentAge + months / 12
        : null,
    points,
  };
}

export type FireScenario = {
  key: string;
  label: string;
  result: FireResult;
};

export function buildFireScenarios(input: FireInput): FireScenario[] {
  return [
    {
      key: "return-down",
      label: "收益 −2%",
      result: calculateFire({
        ...input,
        annualReturn: Math.max(-0.99, input.annualReturn - 0.02),
      }),
    },
    { key: "base", label: "基准", result: calculateFire(input) },
    {
      key: "return-up",
      label: "收益 +2%",
      result: calculateFire({ ...input, annualReturn: input.annualReturn + 0.02 }),
    },
    {
      key: "savings-down",
      label: "结余 −20%",
      result: calculateFire({
        ...input,
        annualSavings: Math.max(0, input.annualSavings * 0.8),
      }),
    },
    {
      key: "savings-up",
      label: "结余 +20%",
      result: calculateFire({
        ...input,
        annualSavings: Math.max(0, input.annualSavings * 1.2),
      }),
    },
  ];
}

export function addMonths(date: string, months: number): string {
  const parts = date.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return date;
  }
  const [year, month, day] = parts;
  const base = new Date(Date.UTC(year, month - 1, 1));
  base.setUTCMonth(base.getUTCMonth() + Math.floor(months));
  const daysInMonth = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const result = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Math.min(day, daysInMonth)),
  );
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(result.getUTCDate()).padStart(2, "0")}`;
}
