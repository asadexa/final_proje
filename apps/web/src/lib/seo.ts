import type { Metadata } from "next";
import { HOME_SLUGS, type Locale } from "./i18n";
import type { Alternate, BlockNode, PublicEntry, SeoData } from "./types";

// Site taban URL'i (prod'da NEXT_PUBLIC_SITE_URL domain'e ayarlanir).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
export const SITE_NAME = "Kron Technologies";

const OG_LOCALE: Record<Locale, string> = { tr: "tr_TR", en: "en_US" };

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isHomeSlug(locale: string, slug: string): boolean {
  return slug === HOME_SLUGS[locale as Locale];
}

// Bir entry'nin public URL yolu: ana sayfa kok (/tr), digerleri flat (/tr/<slug>).
export function pathForEntry(locale: string, slug: string): string {
  return isHomeSlug(locale, slug) ? `/${locale}` : `/${locale}/${slug}`;
}

// hreflang languages haritasi (+ x-default) — resolve endpoint'inin alternates'inden.
function languagesFromAlternates(alternates: Alternate[] | undefined): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const a of alternates ?? []) {
    langs[a.localeCode] = absoluteUrl(pathForEntry(a.localeCode, a.slug));
  }
  if (langs.tr) langs["x-default"] = langs.tr; // varsayilan dil
  return langs;
}

// Entry tabanli sayfalar (ana sayfa, urun, blog yazisi) icin Metadata.
export function metadataFromEntry(entry: PublicEntry, locale: Locale, path: string): Metadata {
  const seo: SeoData = entry.seo ?? {};
  const title = seo.metaTitle ?? entry.title;
  const description = seo.metaDescription ?? entry.excerpt ?? undefined;
  const canonical = seo.canonicalUrl ?? absoluteUrl(path);
  const ogTitle = seo.ogTitle ?? title;
  const ogDescription = seo.ogDescription ?? description;
  // OG paylasim gorseli: kapak gorseli varsa MUTLAK URL'e cevrilir
  // (Slack/WhatsApp/X onizlemeleri goreli yolu cozemez)
  const cover = entry.coverImage?.url;
  const ogImages = cover
    ? [{ url: cover.startsWith("http") ? cover : absoluteUrl(cover), alt: ogTitle }]
    : undefined;
  return {
    title,
    description: description ?? undefined,
    keywords: seo.keywords?.length ? seo.keywords : undefined,
    alternates: { canonical, languages: languagesFromAlternates(entry.alternates) },
    robots: { index: seo.robotsIndex ?? true, follow: seo.robotsFollow ?? true },
    openGraph: {
      type: entry.type === "POST" ? "article" : "website",
      title: ogTitle,
      description: ogDescription ?? undefined,
      url: canonical,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription ?? undefined,
      images: ogImages?.map((i) => i.url),
    },
  };
}

// Entry'siz statik sayfalar (blog listesi, iletisim, kaynaklar) icin Metadata.
export function staticPageMetadata(opts: {
  locale: Locale;
  segment: string; // locale haric yol, orn "/blog"
  title: string;
  description?: string;
}): Metadata {
  const { locale, segment, title, description } = opts;
  const url = absoluteUrl(`/${locale}${segment}`);
  const languages: Record<string, string> = {
    tr: absoluteUrl(`/tr${segment}`),
    en: absoluteUrl(`/en${segment}`),
    "x-default": absoluteUrl(`/tr${segment}`),
  };
  return {
    title,
    description,
    alternates: { canonical: url, languages },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ----------------------------- JSON-LD (schema.org / GEO) -----------------------------

const SAME_AS = [
  "https://www.linkedin.com/company/krontech",
  "https://x.com/kron_tech",
  "https://www.instagram.com/kron.tech/",
  "https://www.youtube.com/channel/UCMV3_pdImKw-DeL6TC0uQQA",
];

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/kron-logo.png"),
    sameAs: SAME_AS,
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function productJsonLd(entry: PublicEntry, path: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: entry.title,
    description: entry.seo?.metaDescription ?? entry.excerpt ?? undefined,
    brand: { "@type": "Organization", name: SITE_NAME },
    url: absoluteUrl(path),
  };
}

export function articleJsonLd(entry: PublicEntry, path: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    description: entry.seo?.metaDescription ?? entry.excerpt ?? undefined,
    datePublished: entry.publishedAt ?? undefined,
    dateModified: entry.updatedAt ?? entry.publishedAt ?? undefined,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/kron-logo.png") },
    },
    mainEntityOfPage: absoluteUrl(path),
  };
}

// FAQ bloklarindan FAQPage (GEO: dogrudan yapilandirilmis soru-cevap).
export function faqJsonLd(blocks: BlockNode[]): JsonLd | null {
  const faqItems: { question: string; answer: string }[] = [];
  for (const b of blocks) {
    if (b.type !== "FAQ") continue;
    const items = Array.isArray(b.data.items)
      ? (b.data.items as Array<{ question?: string; answer?: string }>)
      : [];
    for (const it of items) {
      if (it.question && it.answer) faqItems.push({ question: it.question, answer: it.answer });
    }
  }
  if (faqItems.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}
