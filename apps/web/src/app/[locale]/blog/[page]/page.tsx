import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { staticPageMetadata } from "@/lib/seo";
import { BlogListView } from "../blog-list-view";

// Krontech URL deseni: /blog/2, /blog/3 ... (sayfa 1 = /blog).
function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[page]">): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale)) return {};
  const n = parsePage(page);
  if (!n) return {};
  const dict = getDictionary(locale);
  return staticPageMetadata({
    locale,
    segment: `/blog/${n}`,
    title: `${dict.blog.title} - ${n}`,
    description:
      locale === "tr"
        ? "Erisim guvenligi, Sifir Guven ve veri koruma uzerine Kron blog yazilari."
        : "Kron blog: access security, Zero Trust and data protection insights.",
  });
}

export default async function BlogPagedPage({ params }: PageProps<"/[locale]/blog/[page]">) {
  const { locale, page } = await params;
  if (!isLocale(locale)) notFound();
  const n = parsePage(page);
  if (!n) notFound();
  if (n === 1) redirect(`/${locale}/blog`); // tek kanonik URL
  return <BlogListView locale={locale} page={n} />;
}
