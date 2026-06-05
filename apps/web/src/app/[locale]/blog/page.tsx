import Link from "next/link";
import { notFound } from "next/navigation";
import { listEntries } from "@/lib/api";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const list = await listEntries(locale, "POST");
  const items = list?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="mb-10 text-3xl font-bold text-dark">{dict.blog.title}</h1>
      {items.length === 0 ? (
        <p className="text-muted">{dict.blog.empty}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/${post.slug}`}
              className="rounded-lg border border-line bg-surface p-6 transition hover:border-primary hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold text-dark">{post.title}</h2>
              {post.excerpt && <p className="mt-2 text-sm text-ink-soft">{post.excerpt}</p>}
              <span className="mt-4 inline-block text-sm font-medium text-primary">
                {dict.blog.readMore} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
