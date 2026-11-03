import { z } from "zod";

export const accountInput = z.object({
  name: z.string().trim().min(1, "账户名称不能为空"),
  institution: z.string().trim().optional().default(""),
  kind: z.enum(["bank", "broker", "cash", "other"]).optional().default("bank"),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional().default("CNY"),
  note: z.string().trim().optional().default(""),
});

export const accountPatch = z.object({
  name: z.string().trim().min(1, "账户名称不能为空").optional(),
  institution: z.string().trim().optional(),
  kind: z.enum(["bank", "broker", "cash", "other"]).optional(),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional(),
  note: z.string().trim().optional(),
});

export const categoryInput = z.object({
  name: z.string().trim().min(1, "分类名称不能为空"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "颜色格式不正确")
    .optional()
    .default("#5aa2ff"),
});

export const categoryPatch = z.object({
  name: z.string().trim().min(1, "分类名称不能为空").optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "颜色格式不正确")
    .optional(),
});

export const holdingInput = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "持仓名称不能为空"),
  symbol: z.string().trim().toUpperCase().optional().default(""),
  assetType: z.enum(["cash", "deposit", "wealth", "fund", "stock", "gold", "other"]).optional().default("cash"),
  market: z.enum(["CN", "HK", "US", "FUND", "GOLD", "NONE"]).optional().default("NONE"),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional().default("CNY"),
  quantity: z.number().finite().optional().default(0),
  costBasis: z.number().finite().optional().default(0),
  manualValue: z.number().finite().nullable().optional(),
  manualPrice: z.number().finite().nullable().optional(),
});

export const holdingPatch = z.object({
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "持仓名称不能为空").optional(),
  symbol: z.string().trim().toUpperCase().optional(),
  assetType: z
    .enum(["cash", "deposit", "wealth", "fund", "stock", "gold", "other"])
    .optional(),
  market: z.enum(["CN", "HK", "US", "FUND", "GOLD", "NONE"]).optional(),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional(),
  quantity: z.number().finite().optional(),
  costBasis: z.number().finite().optional(),
  manualValue: z.number().finite().nullable().optional(),
  manualPrice: z.number().finite().nullable().optional(),
});

export const settingsInput = z.object({
  baseCurrency: z.string().trim().min(1).transform((s) => s.toUpperCase()),
});

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD");

export const sellInput = z.object({
  quantity: z.number().finite().positive("卖出数量需大于 0"),
  price: z.number().finite().nonnegative("卖出价不合法"),
  fee: z.number().finite().nonnegative("手续费不合法").optional().default(0),
  sellDate: dateString,
  creditCash: z.boolean().optional().default(true),
});

export const realizedInput = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "名称不能为空"),
  symbol: z.string().trim().toUpperCase().optional().default(""),
  assetType: z
    .enum(["cash", "deposit", "wealth", "fund", "stock", "gold", "other"])
    .optional()
    .default("other"),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional().default("CNY"),
  sellDate: dateString,
  quantity: z.number().finite().nonnegative().optional().default(0),
  costBasis: z.number().finite().nonnegative("成本不能为负").optional().default(0),
  proceeds: z.number().finite().nonnegative("卖出金额不能为负").optional().default(0),
  pnl: z.number().finite().nullable().optional(),
  fee: z.number().finite().nonnegative("手续费不合法").optional().default(0),
  note: z.string().trim().optional().default(""),
});

export const realizedPatch = z.object({
  accountId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, "名称不能为空").optional(),
  symbol: z.string().trim().toUpperCase().optional(),
  assetType: z
    .enum(["cash", "deposit", "wealth", "fund", "stock", "gold", "other"])
    .optional(),
  currency: z.string().trim().min(1).transform((s) => s.toUpperCase()).optional(),
  sellDate: dateString.optional(),
  quantity: z.number().finite().nonnegative().optional(),
  costBasis: z.number().finite().nonnegative("成本不能为负").optional(),
  proceeds: z.number().finite().nonnegative("卖出金额不能为负").optional(),
  pnl: z.number().finite().nullable().optional(),
  fee: z.number().finite().nonnegative("手续费不合法").optional(),
  note: z.string().trim().optional(),
});
