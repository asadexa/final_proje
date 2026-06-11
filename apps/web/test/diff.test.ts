import { describe, it, expect } from "vitest";
import { flatten, diffMaps, diffBlocks, diffMeta, diffSnapshots } from "../src/lib/diff";

describe("diff engine", () => {
  describe("flatten", () => {
    it("should flatten a simple object", () => {
      const obj = { name: "test", details: { score: 95, tags: ["a", "b"] } };
      const map = flatten(obj);

      expect(map.get("name")).toBe("test");
      expect(map.get("details.score")).toBe("95");
      expect(map.get("details.tags.0")).toBe("a");
      expect(map.get("details.tags.1")).toBe("b");
    });

    it("should handle null and empty values", () => {
      const map = flatten(null);
      expect(map.size).toBe(0);
    });
  });

  describe("diffMaps", () => {
    it("should find changes, additions and removals", () => {
      const a = new Map([["name", "old"], ["removed", "val"]]);
      const b = new Map([["name", "new"], ["added", "val"]]);
      const changes = diffMaps(a, b);

      expect(changes).toEqual([
        { path: "added", kind: "added", after: "val" },
        { path: "name", kind: "changed", before: "old", after: "new" },
        { path: "removed", kind: "removed", before: "val" }
      ]);
    });
  });

  describe("diffBlocks", () => {
    it("should identify block-level additions, removals, and modifications", () => {
      const blocksA = [{ type: "HERO", data: { title: "Title A" } }, { type: "FAQ", data: {} }];
      const blocksB = [{ type: "HERO", data: { title: "Title B" } }];

      const diff = diffBlocks(blocksA, blocksB);

      expect(diff).toHaveLength(2);
      expect(diff[0].kind).toBe("kept");
      expect(diff[0].changes).toHaveLength(1); // title changed
      expect(diff[0].changes[0]).toMatchObject({ path: "title", before: "Title A", after: "Title B" });
      expect(diff[1].kind).toBe("removed");
    });
  });

  describe("diffSnapshots", () => {
    it("should compute metadata and block differences with a total change count", () => {
      const snapA = { title: "Page A", blocks: [], seo: { metaTitle: "SEO A" } };
      const snapB = { title: "Page B", blocks: [], seo: { metaTitle: "SEO B" } };

      const diff = diffSnapshots(snapA, snapB);
      expect(diff.meta).toHaveLength(2); // title + seo.metaTitle
      expect(diff.totalChanges).toBe(2);
    });
  });
});
