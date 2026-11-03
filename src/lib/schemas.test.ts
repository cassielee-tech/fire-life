import { describe, expect, it } from "vitest";
import { accountPatch, categoryPatch, holdingPatch } from "./schemas";

describe("partial patch schemas", () => {
  it("does not inject defaults into category patches", () => {
    expect(categoryPatch.parse({})).toEqual({});
    expect(categoryPatch.parse({ name: "核心资产" })).toEqual({
      name: "核心资产",
    });
  });

  it("does not reset holding fields when only category changes", () => {
    expect(holdingPatch.parse({ categoryId: 3 })).toEqual({ categoryId: 3 });
  });

  it("does not reset account fields when only the name changes", () => {
    expect(accountPatch.parse({ name: "招商银行" })).toEqual({
      name: "招商银行",
    });
  });
});
