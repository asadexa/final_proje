import type { Metadata } from "next";
import Link from "next/link";
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
  // POST: icerikteki HERO blogu [slug] makale basligiyla cakisir -> render'dan cikar.
  const isPost = entry.type === "POST";
  const rendered = isPost ? entry.blocks.filter((b) => b.type !== "HERO") : entry.blocks;
  const readingMin = entry.post?.readingMin;
  const cover = entry.coverImage?.url;
  const dateStr = entry.publishedAt
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(
        new Date(entry.publishedAt),
      )
    : null;
  const homeLabel = locale === "tr" ? "Ana Sayfa" : "Home";

  return (
    <article>
      {typeLd && <JsonLd data={typeLd} />}
      {faq && <JsonLd data={faq} />}
      <JsonLd data={breadcrumb} />

      {/* Gorunur breadcrumb — breadcrumb JSON-LD ile uyumlu */}
      <nav aria-label="breadcrumb" className="border-b border-line bg-surface">
        <ol className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-2 px-4 py-3 text-sm text-muted sm:px-6">
          <li>
            <Link href={`/${locale}`} className="hover:text-primary">
              {homeLabel}
            </Link>
          </li>
          {isPost && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/${locale}/blog`} className="hover:text-primary">
                  Blog
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li className="text-ink-soft">{entry.title}</li>
        </ol>
      </nav>

      {isPost && (
        <header className="bg-surface-muted">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Blog</p>
            <h1 className="mt-2 text-3xl font-bold text-dark md:text-4xl">{entry.title}</h1>
            {entry.excerpt && <p className="mt-3 text-lg text-ink-soft">{entry.excerpt}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {dateStr && <span>{dateStr}</span>}
              {dateStr && readingMin ? <span aria-hidden>·</span> : null}
              {readingMin ? (
                <span>
                  {readingMin} {locale === "tr" ? "dk okuma" : "min read"}
                </span>
              ) : null}
            </div>
          </div>
          {cover && (
            <div className="mx-auto max-w-4xl px-4 pb-2 sm:px-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt={entry.title} className="w-full rounded-lg object-cover" />
            </div>
          )}
        </header>
      )}
      <Blocks blocks={rendered} locale={locale} />
    </article>
  );
}
