import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  readStoredTheme,
  resolveTheme,
} from "./theme";

describe("readStoredTheme", () => {
  it("falls back to the default for missing or invalid values", () => {
    expect(readStoredTheme(null)).toBe(DEFAULT_THEME);
    expect(readStoredTheme(undefined)).toBe(DEFAULT_THEME);
    expect(readStoredTheme("blue")).toBe(DEFAULT_THEME);
  });

  it("accepts valid modes", () => {
    expect(readStoredTheme("light")).toBe("light");
    expect(readStoredTheme("dark")).toBe("dark");
    expect(readStoredTheme("system")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves manual modes directly", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system preference in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
