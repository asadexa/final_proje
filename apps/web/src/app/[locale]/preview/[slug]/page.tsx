import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { PostArticle } from "@/components/post-article";
import { PreviewLiveSync } from "@/components/preview-live-sync";
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
        {/* SSE canli senkron: editor kaydedince bu sayfa kendini tazeler */}
        <PreviewLiveSync slug={slug} locale={locale} />
      </div>
      {entry.blocks.length === 0 ? (
        /* Bloksuz icerik: bos sayfa yerine yol gosteren mesaj */
        <div className="mx-auto max-w-[1140px] px-4 py-24 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-dark">{entry.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-ink-soft">
            {locale === "tr"
              ? "Bu içerikte henüz blok yok. Admin panelindeki editörden “+ Blok ekle” ile bölüm ekleyin; eklediğiniz her blok burada görünecek."
              : "This entry has no blocks yet. Add sections via “+ Add block” in the admin editor; every block you add will appear here."}
          </p>
        </div>
      ) : entry.type === "POST" ? (
        /* POST: public sayfayla AYNI duzen (PostArticle) — preview'da gorunen
           publish'te de birebir gorunur (HERO isleme dahil) */
        <PostArticle entry={entry} locale={locale} path={`/${locale}/${slug}`} />
      ) : (
        <Blocks blocks={entry.blocks} locale={locale} />
      )}
    </>
  );
}
