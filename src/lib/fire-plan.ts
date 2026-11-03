import { z } from "zod";

export const FIRE_PLAN_KEY = "fire_plan";
export const FIRE_PLAN_VERSION = 1;

export const firePlanInput = z.object({
  currency: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  target: z.number().finite().positive("目标金额需大于 0"),
  income: z.number().finite().nonnegative("年收入不能为负"),
  expense: z.number().finite().nonnegative("年支出不能为负"),
  annualReturnPct: z.number().finite().nonnegative("年化收益不能为负"),
  considerInflation: z.boolean(),
  inflationPct: z.number().finite().nonnegative("通胀率不能为负"),
  age: z.number().finite().nonnegative().nullable().optional().default(null),
});

export type FirePlanInput = z.infer<typeof firePlanInput>;

export const firePlanSchema = firePlanInput.extend({
  version: z.literal(FIRE_PLAN_VERSION),
  savedAt: z.string(),
});

export type FirePlan = z.infer<typeof firePlanSchema>;

export function buildFirePlan(input: FirePlanInput): FirePlan {
  return {
    version: FIRE_PLAN_VERSION,
    ...input,
    age: input.age ?? null,
    savedAt: new Date().toISOString(),
  };
}

export function parseFirePlan(raw: string | null | undefined): FirePlan | null {
  if (!raw) return null;
  try {
    const parsed = firePlanSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function formatFirePlanSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return savedAt;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
