import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listEntries } from "@/lib/api";
import { getDictionary, isLocale } from "@/lib/i18n";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return staticPageMetadata({
    locale,
    segment: "/blog",
    title: dict.blog.title,
    description:
      locale === "tr"
        ? "Erisim guvenligi, Sifir Guven ve veri koruma uzerine Kron blog yazilari."
        : "Kron blog: access security, Zero Trust and data protection insights.",
  });
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const list = await listEntries(locale, "POST");
  const items = list?.items ?? [];

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
      <h1 className="mb-10 text-3xl font-bold text-dark">{dict.blog.title}</h1>
      {items.length === 0 ? (
        <p className="text-muted">{dict.blog.empty}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((post) => {
            const date = post.publishedAt
              ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                  dateStyle: "long",
                }).format(new Date(post.publishedAt))
              : null;
            return (
              <Link
                key={post.id}
                href={`/${locale}/${post.slug}`}
                className="group flex flex-col overflow-hidden border border-line bg-surface transition hover:shadow-md"
              >
                <div className="relative overflow-hidden">
                  {post.coverImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage.url}
                      alt={post.title}
                      className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/15 to-dark/10" />
                  )}
                  <span className="absolute left-3 top-3 bg-primary px-2 py-0.5 text-xs font-medium text-white">
                    Blog
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base font-semibold leading-snug text-dark transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{post.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                    {date && <span className="text-muted">{date}</span>}
                    <span className="font-medium text-primary">{dict.blog.readMore} →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
