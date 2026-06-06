import type { MetadataRoute } from "next";
import { listAllEntries } from "@/lib/api";
import { LOCALES } from "@/lib/i18n";
import { absoluteUrl, pathForEntry } from "@/lib/seo";
import type { EntryListItem } from "@/lib/types";

// Statik (entry'siz) liste/form sayfalari.
const STATIC_SEGMENTS = ["/blog", "/resources", "/contact"];

// Dinamik sitemap: tum yayindaki icerikler + statik sayfalar, hreflang alternatifleriyle.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const byLocale: Record<string, EntryListItem[]> = {};
  for (const l of LOCALES) {
    const list = await listAllEntries(l);
    byLocale[l] = list?.items ?? [];
  }

  // groupId -> { locale: slug } (ceviri grubu = hreflang seti)
  const groups = new Map<string, Record<string, string>>();
  for (const l of LOCALES) {
    for (const it of byLocale[l]) {
      if (!it.groupId) continue;
      const g = groups.get(it.groupId) ?? {};
      g[l] = it.slug;
      groups.set(it.groupId, g);
    }
  }
  const languagesForGroup = (g: Record<string, string>): Record<string, string> => {
    const langs: Record<string, string> = {};
    for (const l of LOCALES) {
      if (g[l]) langs[l] = absoluteUrl(pathForEntry(l, g[l]));
    }
    return langs;
  };

  const entries: MetadataRoute.Sitemap = [];

  // 1) Entry sayfalari (ana sayfa kok, digerleri flat slug)
  for (const l of LOCALES) {
    for (const it of byLocale[l]) {
      const g = it.groupId ? (groups.get(it.groupId) ?? {}) : {};
      entries.push({
        url: absoluteUrl(pathForEntry(l, it.slug)),
        lastModified: it.updatedAt ?? it.publishedAt ?? undefined,
        changeFrequency: it.type === "POST" ? "weekly" : "monthly",
        priority: it.type === "PAGE" ? 0.8 : 0.6,
        alternates: { languages: languagesForGroup(g) },
      });
    }
  }

  // 2) Statik liste/form sayfalari (her dil)
  const staticLanguages = (seg: string): Record<string, string> =>
    Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(`/${l}${seg}`)]));
  for (const seg of STATIC_SEGMENTS) {
    for (const l of LOCALES) {
      entries.push({
        url: absoluteUrl(`/${l}${seg}`),
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: { languages: staticLanguages(seg) },
      });
    }
  }

  return entries;
}
