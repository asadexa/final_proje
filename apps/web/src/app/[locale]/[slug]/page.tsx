import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
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
  // PRODUCT: krontech sirasi banner -> breadcrumb -> tab bar; breadcrumb
  // PRODUCT_TABS blogunun icinde gelir -> sayfa ustu breadcrumb cizilmez.
  const isProduct = entry.type === "PRODUCT";
  const rendered = isPost ? entry.blocks.filter((b) => b.type !== "HERO") : entry.blocks;
  const readingMin = entry.post?.readingMin;
  const cover = entry.coverImage?.url;
  const dateStr = entry.publishedAt
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(
        new Date(entry.publishedAt),
      )
    : null;
  const homeLabel = locale === "tr" ? "Ana Sayfa" : "Home";

  // POST: alt "Ilgili Yazilar" izgarasi icin son yazilar (krontech blog detay paritesi)
  let related: import("@/lib/types").EntryListItem[] = [];
  if (isPost) {
    const list = await listEntries(locale, "POST", 1, { pageSize: 4 });
    related = (list?.items ?? []).filter((p) => p.slug !== slug).slice(0, 3);
  }
  const relatedLabel = locale === "tr" ? "İlgili Yazılar" : "Related Posts";

  return (
    <article>
      {typeLd && <JsonLd data={typeLd} />}
      {faq && <JsonLd data={faq} />}
      <JsonLd data={breadcrumb} />

      {/* PAGE: gorunur breadcrumb (POST kendi koyu banner'inda; PRODUCT tab cubugunda) */}
      {!isProduct && !isPost && (
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

      {isPost ? (
        <>
          {/* Koyu banner basligi (krontech blog detay stili) */}
          <header
            className="text-white"
            style={{ background: "linear-gradient(120deg, #0a1733 0%, #103aa0 60%, #1563ff 100%)" }}
          >
            <div className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
              <nav aria-label="breadcrumb" className="mb-5 text-sm text-white/70">
                <ol className="flex flex-wrap items-center gap-2">
                  <li>
                    <Link href={`/${locale}`} className="hover:text-white">
                      {homeLabel}
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li>
                    <Link href={`/${locale}/blog`} className="hover:text-white">
                      Blog
                    </Link>
                  </li>
                </ol>
              </nav>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Blog</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight md:text-[2.5rem]">
                {entry.title}
              </h1>
              {entry.excerpt && <p className="mt-4 max-w-2xl text-lg text-white/75">{entry.excerpt}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                {dateStr && <span>{dateStr}</span>}
                {dateStr && readingMin ? <span aria-hidden>·</span> : null}
                {readingMin ? (
                  <span>
                    {readingMin} {locale === "tr" ? "dk okuma" : "min read"}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {/* Kapak gorseli banner ile cakisarak makaleye giris */}
          {cover && (
            <div className="mx-auto -mt-8 max-w-3xl px-4 sm:px-6">
              <Image
                src={cover}
                alt={entry.title}
                width={896}
                height={504}
                sizes="(max-width: 896px) 100vw, 896px"
                className="h-auto w-full rounded-lg object-cover shadow-lg"
              />
            </div>
          )}

          <Blocks blocks={rendered} locale={locale} />

          {/* Ilgili yazilar — krontech blog detay "related" paritesi (alt izgara) */}
          {related.length > 0 && (
            <section className="bg-surface-muted">
              <div className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
                <h2 className="mb-6 text-2xl font-bold text-dark">{relatedLabel}</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {related.map((p) => {
                    const d = p.publishedAt
                      ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                          dateStyle: "long",
                        }).format(new Date(p.publishedAt))
                      : null;
                    return (
                      <Link
                        key={p.slug}
                        href={`/${locale}/${p.slug}`}
                        className="group block overflow-hidden rounded-lg border border-line bg-surface transition hover:shadow-md"
                      >
                        {p.coverImage?.url ? (
                          <Image
                            src={p.coverImage.url}
                            alt={p.title}
                            width={420}
                            height={236}
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="h-44 w-full bg-surface-muted" />
                        )}
                        <div className="p-4">
                          {d && <p className="text-xs text-muted">{d}</p>}
                          <h3 className="mt-1 line-clamp-2 font-semibold text-dark transition-colors group-hover:text-primary">
                            {p.title}
                          </h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <Blocks blocks={rendered} locale={locale} />
      )}
    </article>
  );
}
