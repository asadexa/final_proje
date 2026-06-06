import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { JsonLd } from "@/components/json-ld";
import { getEntry } from "@/lib/api";
import { HOME_SLUGS, isLocale } from "@/lib/i18n";
import { metadataFromEntry, websiteJsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const entry = await getEntry(locale, HOME_SLUGS[locale]);
  if (!entry) return {};
  return metadataFromEntry(entry, locale, `/${locale}`);
}

// Ana sayfa: /[locale] kok; dile gore home slug'i ile cozumlenir.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const slug = isLocale(locale) ? HOME_SLUGS[locale] : "home";
  const entry = await getEntry(locale, slug);
  if (!entry) notFound();
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <Blocks blocks={entry.blocks} locale={locale} />
    </>
  );
}
