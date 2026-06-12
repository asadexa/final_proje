import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { BlogShareLinks, formatBlogDate, HighlightsSidebar } from "@/components/blog-shared";
import { Blocks } from "@/components/blocks";
import { RICH_TEXT_PROSE } from "@/components/blocks-view";
import { listEntries } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/seo";
import type { BlockNode, PublicEntry } from "@/lib/types";

// Blog detay govdesi — krontech #blog-detail birebir. HEM public sayfa
// ([locale]/[slug]) HEM preview ayni bileseni kullanir: preview'da gorunen
// publish'te de birebir gorunur (onceden preview Blocks basiyordu, public
// sayfa HERO'yu atiyordu -> "preview'da var, yayinda yok" tuzagi).

// Seed'in yalniz-baslik HERO'su makale basligini ciftler -> atlanir; ama
// editorun GERCEK icerik tasiyan HERO'su (gorsel/grafik/altbaslik/buton/slide)
// makale ustunde render edilir. Onceden TUM HERO'lar atiliyordu — editor
// icerigi sessizce kayboluyordu (bug).
function isMeaningfulHero(b: BlockNode): boolean {
  const d = b.data as {
    image?: { url?: string };
    graphic?: { url?: string };
    subtitle?: string;
    cta?: { href?: string };
    buttons?: unknown[];
    slides?: unknown[];
  };
  return Boolean(
    d.image?.url ||
      d.graphic?.url ||
      d.subtitle ||
      d.cta?.href ||
      (Array.isArray(d.buttons) && d.buttons.length > 0) ||
      (Array.isArray(d.slides) && d.slides.length > 0),
  );
}

export async function PostArticle({
  entry,
  locale,
  path,
}: {
  entry: PublicEntry;
  locale: Locale;
  path: string;
}): Promise<ReactElement> {
  const heroes = entry.blocks.filter((b) => b.type === "HERO" && isMeaningfulHero(b));
  const richTexts = entry.blocks.filter((b) => b.type === "RICH_TEXT");
  const rest = entry.blocks.filter((b) => b.type !== "RICH_TEXT" && b.type !== "HERO");
  const highlights = await listEntries(locale, "POST", 1, { pageSize: 10, featured: true });
  const featured = (highlights?.items ?? []).filter((p) => p.slug !== entry.slug);
  const dateStr = entry.publishedAt ? formatBlogDate(locale, entry.publishedAt) : null;
  const cover = entry.coverImage?.url;
  const homeLabel = locale === "tr" ? "Ana Sayfa" : "Home";

  return (
    <>
      {/* Editorun ekledigi gercek HERO'lar (varsa) makale ustunde tam genislik */}
      {heroes.length > 0 && <Blocks blocks={heroes} locale={locale} />}

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
    </>
  );
}
