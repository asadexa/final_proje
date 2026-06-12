import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShareLinks, formatBlogDate, HighlightsSidebar } from "@/components/blog-shared";
import { Blocks } from "@/components/blocks";
import { RICH_TEXT_PROSE } from "@/components/blocks-view";
import { JsonLd } from "@/components/json-ld";
import { getEntry, listEntries } from "@/lib/api";
import { isLocale } from "@/lib/i18n";
import {
  absoluteUrl,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  metadataFromEntry,
  productJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const entry = await getEntry(locale, slug);
  if (!entry) return {};
  return metadataFromEntry(entry, locale, `/${locale}/${slug}`);
}

// Flat kok slug cozumleyici: urun / blog yazisi / generic sayfa.
export default async function EntryPage({ params }: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const entry = await getEntry(locale, slug);
  if (!entry) notFound();

  const path = `/${locale}/${slug}`;
  const typeLd =
    entry.type === "PRODUCT"
      ? productJsonLd(entry, path)
      : entry.type === "POST"
        ? articleJsonLd(entry, path)
        : null;
  const faq = faqJsonLd(entry.blocks);
  const homeLabel = locale === "tr" ? "Ana Sayfa" : "Home";
  const breadcrumb = breadcrumbJsonLd([
    { name: homeLabel, url: absoluteUrl(`/${locale}`) },
    { name: entry.title, url: absoluteUrl(path) },
  ]);
  const isPost = entry.type === "POST";
  // PRODUCT_TABS bloku kendi breadcrumb'ini cizer (urunler + sekme stub
  // sayfalari) -> sayfa ustu genel breadcrumb cizilmez (cift olmasin).
  const hasOwnBreadcrumb = entry.blocks.some((b) => b.type === "PRODUCT_TABS");

  if (isPost) {
    // Blog detay — krontech #blog-detail birebir: col-8 makale (kapak ustte,
    // h1, .blog-terms 12px tarih, .blog-socials paylasim, govde) + col-4
    // Highlights sticky sidebar (liste sayfasiyla paylasilan). HERO blogu
    // makale basligiyla cakisir -> atlanir; RICH_TEXT'ler govde olarak
    // dogrudan basilir (Container'siz, kolon genisliginde — krontech col-8).
    // Kalan bloklar (orn. FAQ akordeonu) makale altinda tam genislikte.
    const richTexts = entry.blocks.filter((b) => b.type === "RICH_TEXT");
    const rest = entry.blocks.filter((b) => b.type !== "RICH_TEXT" && b.type !== "HERO");
    const highlights = await listEntries(locale, "POST", 1, { pageSize: 10, featured: true });
    const featured = (highlights?.items ?? []).filter((p) => p.slug !== slug);
    const dateStr = entry.publishedAt ? formatBlogDate(locale, entry.publishedAt) : null;
    const cover = entry.coverImage?.url;

    return (
      <article>
        {typeLd && <JsonLd data={typeLd} />}
        {faq && <JsonLd data={faq} />}
        <JsonLd data={breadcrumb} />

        {/* Breadcrumb: 11px, #333, son oge bold (krontech breadcrumb-desktop) */}
        <nav aria-label="breadcrumb" className="mx-auto mt-3 max-w-[1140px] px-4 sm:px-6">
          <ol className="flex flex-wrap gap-2 text-[11px] text-[#333]">
            <li>
              <Link href={`/${locale}`} className="hover:text-primary">
                {homeLabel}
              </Link>
            </li>
            <li aria-hidden className="opacity-60">
              /
            </li>
            <li>
              <Link href={`/${locale}/blog`} className="hover:text-primary">
                Blog
              </Link>
            </li>
            <li aria-hidden className="opacity-60">
              /
            </li>
            <li className="font-semibold">{entry.title}</li>
          </ol>
        </nav>

        {/* col-md-8 makale + col-md-4 Highlights */}
        <section className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 gap-[30px] md:grid-cols-3">
            <div className="md:col-span-2">
              {cover && (
                <Image
                  src={cover}
                  alt={entry.title}
                  width={730}
                  height={411}
                  priority
                  sizes="(max-width: 768px) 100vw, 730px"
                  className="mb-3 w-full object-cover"
                />
              )}
              <h1 className="text-[32px] font-semibold leading-tight text-dark">{entry.title}</h1>
              {/* krontech .blog-terms: 12px, mb-17 (yazar alani modelde yok -> tarih) */}
              {dateStr && <p className="mb-[17px] mt-2 text-xs text-[#333]">{dateStr}</p>}
              <BlogShareLinks url={absoluteUrl(path)} title={entry.title} />
              {richTexts.map((b) => (
                <div
                  key={b.id}
                  className={RICH_TEXT_PROSE}
                  // Icerik yazma kapisinda whitelist-sanitize edilir (guvenlik turu)
                  dangerouslySetInnerHTML={{ __html: String(b.data.html ?? "") }}
                />
              ))}
            </div>
            <aside>
              <HighlightsSidebar posts={featured} locale={locale} />
            </aside>
          </div>
        </section>

        {/* Kalan bloklar (orn. FAQ akordeonu) — krontech collapse-general */}
        <Blocks blocks={rest} locale={locale} />
      </article>
    );
  }

  return (
    <article>
      {typeLd && <JsonLd data={typeLd} />}
      {faq && <JsonLd data={faq} />}
      <JsonLd data={breadcrumb} />

      {/* PAGE: gorunur breadcrumb (PRODUCT_TABS'li sayfalar kendi cizer) */}
      {!hasOwnBreadcrumb && (
        <nav aria-label="breadcrumb" className="border-b border-line bg-surface">
          <ol className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-2 px-4 py-3 text-sm text-muted sm:px-6">
            <li>
              <Link href={`/${locale}`} className="hover:text-primary">
                {homeLabel}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-ink-soft">{entry.title}</li>
          </ol>
        </nav>
      )}
      <Blocks blocks={entry.blocks} locale={locale} />
    </article>
  );
}
