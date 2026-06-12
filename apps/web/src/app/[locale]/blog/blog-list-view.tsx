import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBlogDate, HighlightsSidebar } from "@/components/blog-shared";
import { listEntries } from "@/lib/api";
import { getDictionary, type Locale } from "@/lib/i18n";
import type { EntryListItem } from "@/lib/types";

// Krontech blog listesi: 5 yazi/sayfa (olculen), sag kolonda Highlights.
export const BLOG_PAGE_SIZE = 5;

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

          {/* Highlights: sticky widget, 150x87 luminosity gorseller (paylasilan) */}
          <aside>
            <HighlightsSidebar posts={featured} locale={locale} />
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
          <Image
            src={post.coverImage.url}
            alt={post.title}
            width={730}
            height={411}
            sizes="(max-width: 768px) 100vw, 730px"
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
