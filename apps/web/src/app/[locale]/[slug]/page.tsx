import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { JsonLd } from "@/components/json-ld";
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
  const breadcrumb = breadcrumbJsonLd([
    { name: locale === "tr" ? "Ana Sayfa" : "Home", url: absoluteUrl(`/${locale}`) },
    { name: entry.title, url: absoluteUrl(path) },
  ]);

  return (
    <article>
      {typeLd && <JsonLd data={typeLd} />}
      {faq && <JsonLd data={faq} />}
      <JsonLd data={breadcrumb} />
      {entry.type === "POST" && (
        <header className="bg-surface-muted">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Blog</p>
            <h1 className="mt-2 text-3xl font-bold text-dark md:text-4xl">{entry.title}</h1>
            {entry.excerpt && <p className="mt-3 text-lg text-ink-soft">{entry.excerpt}</p>}
          </div>
        </header>
      )}
      <Blocks blocks={entry.blocks} locale={locale} />
    </article>
  );
}
