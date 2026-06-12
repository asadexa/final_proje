import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { JsonLd } from "@/components/json-ld";
import { PostArticle } from "@/components/post-article";
import { getEntry } from "@/lib/api";
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
    // Blog detay — krontech #blog-detail birebir; govde PostArticle'da
    // (preview ile PAYLASILIR: preview'da gorunen publish'te de gorunur).
    return (
      <article>
        {typeLd && <JsonLd data={typeLd} />}
        {faq && <JsonLd data={faq} />}
        <JsonLd data={breadcrumb} />
        <PostArticle entry={entry} locale={locale} path={path} />
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
