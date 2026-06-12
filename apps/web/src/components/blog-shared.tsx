import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { EntryListItem } from "@/lib/types";

// Blog liste + detay sayfalarinin paylastigi parcalar (krontech birebir).

// Krontech tarih bicimi: "May 12, 2026" / "Şub 17, 2026" (ay kisaltma + gun, yil).
export function formatBlogDate(locale: Locale, iso: string): string {
  const d = new Date(iso);
  const month = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
  }).format(d);
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month} ${day}, ${d.getUTCFullYear()}`;
}

// Highlights sidebar — krontech .widget.js-sticky-widget: sticky kart,
// 150x87 luminosity gorseller (hover normal), 14px/500 baslik + 12px/.5 tarih.
export function HighlightsSidebar({
  posts,
  locale,
}: {
  posts: EntryListItem[];
  locale: Locale;
}): ReactElement {
  const dict = getDictionary(locale);
  return (
    <div className="sticky top-[140px] bg-surface px-5 py-[33px] shadow-[0_6px_12px_-4px_rgba(37,38,41,0.12)]">
      {/* krontech bgblueb: ikinci kelime mavi cipli (TR "Öne Çıkanlar") */}
      <h3 className="mb-[15px] text-lg font-medium text-dark">
        {dict.blog.highlights}
        {dict.blog.highlightsAccent && (
          <>
            {" "}
            <b className="bg-primary px-[3px] font-medium text-white">
              {dict.blog.highlightsAccent}
            </b>
          </>
        )}
      </h3>
      <div>
        {posts.map((post) => (
          <div key={post.id} className="clear-both min-h-[111px] pb-3">
            <Link href={`/${locale}/${post.slug}`} className="group block">
              {post.coverImage?.url && (
                <Image
                  src={post.coverImage.url}
                  alt={post.title}
                  width={150}
                  height={87}
                  className="float-left mb-3 mr-[15px] h-[87px] w-[150px] object-cover mix-blend-luminosity group-hover:mix-blend-normal"
                />
              )}
              <p className="text-sm font-medium leading-[19px] text-dark group-hover:text-primary">
                {post.title}
              </p>
              {post.publishedAt && (
                <p className="text-xs text-dark opacity-50">
                  {formatBlogDate(locale, post.publishedAt)}
                </p>
              )}
              <span className="clear-both block" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sosyal paylasim ikonlari — krontech .blog-socials: 22px, #333, aralik 17px.
export function BlogShareLinks({ url, title }: { url: string; title: string }): ReactElement {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${u}&title=${t}`,
      d: "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.84-2.2 3.8-2.2 4.06 0 4.8 2.67 4.8 6.15V24h-4v-8.5c0-2.03-.04-4.65-2.83-4.65-2.84 0-3.27 2.2-3.27 4.5V24H8V8z",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      d: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      d: "M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.9-7.7-6.7 7.7H.2l8.7-9.9L0 1.2h7.7l5.3 7 6-7zm-1.3 19.4h2L6.6 3.3h-2.2l13.2 17.3z",
    },
  ];
  return (
    <div className="mb-[14px] flex items-center gap-[17px]">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          aria-label={l.label}
          className="text-[#333] transition-colors hover:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]" aria-hidden>
            <path d={l.d} />
          </svg>
        </a>
      ))}
    </div>
  );
}
