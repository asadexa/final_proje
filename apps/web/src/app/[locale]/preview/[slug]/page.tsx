import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { getPreviewEntry } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

// Onizleme: imzali jetonla taslak icerik. Asla cache'lenmez ve indexlenmez.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({
  params,
  searchParams,
}: PageProps<"/[locale]/preview/[slug]">) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  if (!isLocale(locale) || !token) notFound();

  const entry = await getPreviewEntry(locale, slug, token);
  if (!entry) notFound();

  return (
    <>
      <div className="bg-accent px-4 py-2 text-center text-sm font-medium text-white">
        {locale === "tr"
          ? "Önizleme modu — taslak içerik (yayında değil)"
          : "Preview mode — draft content (not published)"}
      </div>
      <Blocks blocks={entry.blocks} locale={locale} />
    </>
  );
}
