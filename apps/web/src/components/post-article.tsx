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

// Baslik metninden anchor id'si (Turkce karakter sadelestirme).
function slugifyHeading(s: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return (
    s
      .replace(/<[^>]+>/g, "")
      .toLowerCase()
      .split("")
      .map((c) => map[c] ?? c)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "bolum"
  );
}

// Govdedeki <h2>'lere id enjekte eder + TOC listesi cikarir (krontech "Table of Contents").
function buildToc(html: string): { html: string; toc: Array<{ id: string; text: string }> } {
  const toc: Array<{ id: string; text: string }> = [];
  const used = new Set<string>();
  const out = html.replace(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = slugifyHeading(text);
    const base = id;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
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
  // Yazar: editorde duzenlenir; bos ise varsayilan site adi (krontech "tarih / yazar").
  const author = entry.authorName?.trim() || (locale === "tr" ? "Kron Ekibi" : "Kron Team");
  // Govde tek RICH_TEXT akisi; H2'lerden TOC + h2 id enjeksiyonu.
  const { html: bodyHtml, toc } = buildToc(richTexts.map((b) => String(b.data.html ?? "")).join("\n"));

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
            {/* krontech .blog-terms: 12px — tarih · yazar */}
            <p className="mb-[17px] mt-2 text-xs text-[#333]">
              {dateStr && <span>{dateStr}</span>}
              {dateStr && <span className="px-1.5 opacity-50">·</span>}
              <span>{author}</span>
            </p>
            <BlogShareLinks url={absoluteUrl(path)} title={entry.title} />
            {/* Icindekiler — govdedeki H2'lerden otomatik (krontech Table of Contents) */}
            {toc.length > 1 && (
              <nav
                aria-label={locale === "tr" ? "İçindekiler" : "Table of Contents"}
                className="my-6 rounded-lg border border-line bg-surface-muted p-4"
              >
                <p className="mb-2 text-sm font-semibold text-dark">
                  {locale === "tr" ? "İçindekiler" : "Table of Contents"}
                </p>
                <ol className="space-y-1 text-sm">
                  {toc.map((t, i) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="text-primary hover:underline">
                        {i + 1}. {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {/* Govde tek akis (krontech makale): H2 bolumleri + inline gorsel + listeler.
                H2 id'leri render aninda eklenir (TOC anchor'lari); HTML zaten DB'ye
                yazilirken whitelist-sanitize edildi (guvenli <img>/<figure> dahil). */}
            <div className={RICH_TEXT_PROSE} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
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
