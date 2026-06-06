import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { getEntry } from "@/lib/api";

// Flat kok slug cozumleyici: urun / blog yazisi / generic sayfa.
export default async function EntryPage({ params }: PageProps<"/[locale]/[slug]">) {
  const { locale, slug } = await params;
  const entry = await getEntry(locale, slug);
  if (!entry) notFound();

  return (
    <article>
      {entry.type === "POST" && (
        <header className="bg-surface-muted">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Blog</p>
            <h1 className="mt-2 text-3xl font-bold text-dark md:text-4xl">{entry.title}</h1>
            {entry.excerpt && <p className="mt-3 text-lg text-ink-soft">{entry.excerpt}</p>}
          </div>
        </header>
      )}
      <Blocks blocks={entry.blocks} locale={locale} />
    </article>
  );
}
