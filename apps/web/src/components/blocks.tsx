import type { ReactElement } from "react";
import { listEntries } from "@/lib/api";
import type { BlockNode } from "@/lib/types";
import { BlogCarouselClient } from "./blog-carousel";
import { REGISTRY } from "./blocks-view";
import { DynamicForm } from "./dynamic-form";

// Server tarafi blok render'i: salt-gorsel bloklar blocks-view REGISTRY'sinden,
// veri ceken bloklar (BLOG_CAROUSEL async fetch, CONTACT_FORM tanim ceker) burada.

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

// BLOG_CAROUSEL: son yazilari API'den ceker (locale gerektirir) -> istemci carousel.
async function BlogCarousel({
  data,
  locale,
}: {
  data: Record<string, unknown>;
  locale: string;
}): Promise<ReactElement | null> {
  const limit = num(data.limit) || 6;
  const list = await listEntries(locale, "POST", 1);
  // Tarih server'da locale'e gore formatlanir (hidrasyon uyumu icin string gecilir).
  const fmt = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" });
  const posts = (list?.items ?? []).slice(0, limit).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? null,
    image: p.coverImage?.url ?? null,
    date: p.publishedAt ? fmt.format(new Date(p.publishedAt)) : null,
  }));
  if (posts.length === 0) return null;
  return <BlogCarouselClient title={str(data.title)} posts={posts} locale={locale} />;
}

export function Blocks({
  blocks,
  locale,
}: {
  blocks: BlockNode[];
  locale: string;
}): ReactElement {
  return (
    <>
      {blocks.map((b) => {
        // BLOG_CAROUSEL async (yazilari ceker); ayrica ele alinir.
        if (b.type === "BLOG_CAROUSEL") {
          return <BlogCarousel key={b.id} data={b.data} locale={locale} />;
        }
        // CONTACT_FORM locale gerektirir: admin'de tanimlanan formu render eder.
        if (b.type === "CONTACT_FORM") {
          const d = b.data as { formKey?: string; title?: string; consentText?: string };
          if (!d.formKey) return null;
          return (
            <DynamicForm
              key={b.id}
              formKey={d.formKey}
              title={d.title}
              consentText={d.consentText}
              locale={locale}
            />
          );
        }
        const Component = REGISTRY[b.type];
        return Component ? <Component key={b.id} data={b.data} /> : null;
      })}
    </>
  );
}
