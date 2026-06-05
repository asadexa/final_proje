import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { getEntry } from "@/lib/api";
import { HOME_SLUGS, isLocale } from "@/lib/i18n";

// Ana sayfa: /[locale] kok; dile gore home slug'i ile cozumlenir.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const slug = isLocale(locale) ? HOME_SLUGS[locale] : "home";
  const entry = await getEntry(locale, slug);
  if (!entry) notFound();
  return <Blocks blocks={entry.blocks} />;
}
