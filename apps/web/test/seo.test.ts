import { describe, it, expect } from "vitest";
import {
  absoluteUrl,
  pathForEntry,
  metadataFromEntry,
  staticPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  productJsonLd,
  articleJsonLd,
  faqJsonLd
} from "../src/lib/seo";
import type { PublicEntry } from "../src/lib/types";

describe("seo helpers", () => {
  describe("absoluteUrl", () => {
    it("should prepend site URL correctly", () => {
      expect(absoluteUrl("/test")).toMatch(/localhost:3000\/test$/);
      expect(absoluteUrl("test")).toMatch(/localhost:3000\/test$/);
    });
  });

  describe("pathForEntry", () => {
    it("should handle homepages differently than subpages", () => {
      expect(pathForEntry("tr", "anasayfa")).toBe("/tr");
      expect(pathForEntry("en", "home")).toBe("/en");
      expect(pathForEntry("tr", "kron-pam")).toBe("/tr/kron-pam");
      expect(pathForEntry("en", "kron-pam")).toBe("/en/kron-pam");
    });
  });

  describe("metadataFromEntry", () => {
    it("should build proper Next.js metadata from entry attributes", () => {
      const entry: PublicEntry = {
        id: "1",
        type: "PAGE",
        slug: "test-page",
        title: "Test Page",
        excerpt: "This is a test page",
        localeCode: "tr",
        blocks: [],
        seo: {
          metaTitle: "Custom Meta Title",
          metaDescription: "Custom Meta Description",
          robotsIndex: true,
          robotsFollow: true
        }
      };

      const meta = metadataFromEntry(entry, "tr", "/tr/test-page");
      expect(meta.title).toBe("Custom Meta Title");
      expect(meta.description).toBe("Custom Meta Description");
      expect(meta.robots).toEqual({ index: true, follow: true });
    });
  });

  describe("JSON-LD structure", () => {
    it("should produce correct organization schema", () => {
      const org = organizationJsonLd();
      expect(org["@type"]).toBe("Organization");
      expect(org.name).toBe("Kron Technologies");
    });

    it("should produce correct website schema", () => {
      const ws = websiteJsonLd();
      expect(ws["@type"]).toBe("WebSite");
    });

    it("should generate breadcrumb lists", () => {
      const items = [{ name: "Ana Sayfa", url: "http://localhost:3000/tr" }];
      const bc = breadcrumbJsonLd(items);
      expect(bc["@type"]).toBe("BreadcrumbList");
      expect(bc.itemListElement).toHaveLength(1);
    });

    it("should generate FAQ structured data", () => {
      const blocks = [
        {
          id: "b1",
          type: "FAQ",
          data: {
            items: [
              { question: "What?", answer: "This." }
            ]
          }
        }
      ];

      const faq = faqJsonLd(blocks);
      expect(faq).not.toBeNull();
      expect(faq?.["@type"]).toBe("FAQPage");
    });
  });
});
