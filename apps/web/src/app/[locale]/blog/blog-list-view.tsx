import Link from "next/link";
import { notFound } from "next/navigation";
import { listEntries } from "@/lib/api";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { EntryListItem } from "@/lib/types";

// Krontech blog listesi: 5 yazi/sayfa (olculen), sag kolonda Highlights.
export const BLOG_PAGE_SIZE = 5;

// Krontech tarih bicimi: "May 12, 2026" / "Şub 17, 2026" (ay kisaltma + gun, yil).
function formatBlogDate(locale: Locale, iso: string): string {
  const d = new Date(iso);
  const month = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
  }).format(d);
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month} ${day}, ${d.getUTCFullYear()}`;
}

// Bootstrap benzeri sayfalama dizisi: 1 2 3 4 ... N (krontech deseni).
function pageNumbers(total: number): (number | "...")[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  return [1, 2, 3, 4, "...", total];
}

function pageHref(locale: Locale, n: number): string {
  return n === 1 ? `/${locale}/blog` : `/${locale}/blog/${n}`;
}

export async function BlogListView({
  locale,
  page,
}: {
  locale: Locale;
  page: number;
}) {
  const dict = getDictionary(locale);
  const [list, highlights] = await Promise.all([
    listEntries(locale, "POST", page, { pageSize: BLOG_PAGE_SIZE }),
    listEntries(locale, "POST", 1, { pageSize: 10, featured: true }),
  ]);
  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  if (page > totalPages) notFound();
  const featured = highlights?.items ?? [];

  return (
    <>
      {/* Banner bandi: container icinde 226px, koyu gorsel + %41 siyah overlay */}
      <section className="mx-auto max-w-[1140px] sm:px-6">
        <div
          className="relative flex h-[226px] items-center justify-center bg-black bg-cover bg-center"
          style={{ backgroundImage: "url(/kron/blog-banner.jpg)" }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden />
          <h1 className="relative z-10 text-[32px] font-semibold text-white">
            {dict.blog.title}
          </h1>
        </div>
      </section>

      {/* Breadcrumb: 11px, #333, son oge bold */}
      <nav
        aria-label="breadcrumb"
        className="mx-auto mt-3 max-w-[1140px] px-4 sm:px-6"
      >
        <ol className="flex gap-2 text-[11px] text-[#333]">
          <li>
            <Link href={`/${locale}`} className="hover:text-primary">
              {dict.blog.home}
            </Link>
          </li>
          <li aria-hidden className="opacity-60">
            /
          </li>
          <li className="font-semibold">{dict.blog.title}</li>
        </ol>
      </nav>

      {/* Liste + sidebar: col-md-8 / col-md-4 */}
      <section className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-[30px] md:grid-cols-3">
          <div className="md:col-span-2">
            {items.length === 0 ? (
              <p className="text-muted">{dict.blog.empty}</p>
            ) : (
              items.map((post) => (
                <BlogListItem key={post.id} post={post} locale={locale} readMore={dict.blog.readMore} />
              ))
            )}

            {/* Sayfalama (krontech: 1 2 3 4 ... N) */}
            {totalPages > 1 && (
              <nav aria-label="pagination" className="mt-2">
                <ul className="flex">
                  {pageNumbers(totalPages).map((n, i) =>
                    n === "..." ? (
                      <li key={`e${i}`}>
                        <span className="-ml-px block border border-[#dee2e6] bg-white px-3 py-2 text-sm text-muted">
                          ...
                        </span>
                      </li>
                    ) : (
                      <li key={n}>
                        <Link
                          href={pageHref(locale, n)}
                          aria-current={n === page ? "page" : undefined}
                          className={`-ml-px block border px-3 py-2 text-sm ${
                            n === page
                              ? "border-primary bg-primary text-white"
                              : "border-[#dee2e6] bg-white text-primary hover:bg-bg"
                          }`}
                        >
                          {n}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </nav>
            )}
          </div>

          {/* Highlights: sticky widget, 150x87 luminosity gorseller */}
          <aside>
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
                {featured.map((post) => (
                  <div key={post.id} className="clear-both min-h-[111px] pb-3">
                    <Link href={`/${locale}/${post.slug}`} className="group block">
                      {post.coverImage?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.coverImage.url}
                          alt={post.title}
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
          </aside>
        </div>
      </section>
    </>
  );
}

// Tek liste karti: tam genislik kapak (411px), seffaf kart, alt cizgi ayirici.
function BlogListItem({
  post,
  locale,
  readMore,
}: {
  post: EntryListItem;
  locale: Locale;
  readMore: string;
}) {
  const href = `/${locale}/${post.slug}`;
  return (
    <article className="mb-[42px] border-b border-[#dedede]">
      <Link href={href} className="block">
        {post.coverImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage.url}
            alt={post.title}
            className="h-[411px] w-full object-cover max-md:h-[220px]"
          />
        ) : (
          <div className="h-[411px] w-full bg-gradient-to-br from-primary/15 to-dark/10 max-md:h-[220px]" />
        )}
      </Link>
      <div className="pt-5">
        <Link href={href} className="group block">
          <h4 className="text-2xl font-medium leading-snug text-[#333] group-hover:text-primary">
            {post.title}
          </h4>
          {post.excerpt && (
            <p className="mt-3 text-lg leading-[25px] text-[#333]">{post.excerpt}</p>
          )}
        </Link>
        <div className="mb-[17px] mt-4 flex items-center justify-between text-xs text-[#333]">
          {post.publishedAt ? <b>{formatBlogDate(locale, post.publishedAt)}</b> : <span />}
          <Link href={href} className="text-sm font-semibold text-[#333] hover:text-primary">
            {readMore}&rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}
