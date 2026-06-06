import { describe, expect, it } from "vitest";
import { BLOCK_TYPES, isBlockType, validateBlockData } from "./index";

describe("validateBlockData", () => {
  it("HERO: gecerli veri", () => {
    expect(validateBlockData("HERO", { title: "Merhaba" }).success).toBe(true);
  });

  it("HERO: title zorunlu", () => {
    expect(validateBlockData("HERO", {}).success).toBe(false);
  });

  it("HERO: slides[] destekler (carousel — migration'siz genisleme)", () => {
    const r = validateBlockData("HERO", {
      title: "x",
      slides: [{ title: "Slide 1", cta: { label: "Git", href: "/x" } }],
    });
    expect(r.success).toBe(true);
  });

  it("STATS: items value+label dogrular", () => {
    expect(validateBlockData("STATS", { items: [{ value: "6", label: "Kita" }] }).success).toBe(
      true,
    );
    expect(validateBlockData("STATS", { items: [{ value: "6" }] }).success).toBe(false);
  });

  it("FAQ: question+answer dogrular (GEO)", () => {
    expect(
      validateBlockData("FAQ", { items: [{ question: "Nedir?", answer: "Budur." }] }).success,
    ).toBe(true);
  });

  it("bilinmeyen blok tipi reddedilir", () => {
    expect(validateBlockData("NOPE" as never, {}).success).toBe(false);
  });
});

describe("isBlockType", () => {
  it("gecerli/gecersiz tip", () => {
    expect(isBlockType("HERO")).toBe(true);
    expect(isBlockType("XXX")).toBe(false);
  });

  it("tum BLOCK_TYPES gecerli kabul edilir", () => {
    for (const t of BLOCK_TYPES) expect(isBlockType(t)).toBe(true);
  });
});
