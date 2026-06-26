import { describe, expect, it } from "vitest";
import { fuzzyScore } from "../src/lib/fuzzy";

describe("fuzzyScore (command palette)", () => {
  it("bos sorgu her seyi esler (skor 1)", () => {
    expect(fuzzyScore("", "herhangi")).toBe(1);
  });

  it("tum karakterler sirayla gecmezse 0 doner", () => {
    expect(fuzzyScore("xyz", "abc")).toBe(0);
    expect(fuzzyScore("cba", "abc")).toBe(0); // sira onemli
  });

  it("erken/ardisik eslesme daha yuksek skor alir", () => {
    expect(fuzzyScore("med", "Medya")).toBeGreaterThan(fuzzyScore("med", "Komut medya"));
  });

  it("kisa metin bonusu: ayni eslesme kisa metinde daha yuksek", () => {
    expect(fuzzyScore("a", "a")).toBeGreaterThan(fuzzyScore("a", "a".padEnd(40, "x")));
  });

  it("buyuk/kucuk harf duyarsiz", () => {
    expect(fuzzyScore("MED", "medya")).toBeGreaterThan(0);
  });
});
