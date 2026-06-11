import { describe, it, expect } from "vitest";
import { isLocale, getDictionary, LOCALES, DEFAULT_LOCALE } from "../src/lib/i18n";

describe("i18n helpers", () => {
  it("should validate locales correctly", () => {
    expect(isLocale("tr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("should have expected constant values", () => {
    expect(LOCALES).toContain("tr");
    expect(LOCALES).toContain("en");
    expect(DEFAULT_LOCALE).toBe("tr");
  });

  it("should load dictionary files successfully", () => {
    const trDict = getDictionary("tr");
    const enDict = getDictionary("en");

    expect(trDict).toBeDefined();
    expect(enDict).toBeDefined();

    // Verify common keys exist
    expect(trDict).toHaveProperty("nav");
    expect(enDict).toHaveProperty("nav");
  });
});
