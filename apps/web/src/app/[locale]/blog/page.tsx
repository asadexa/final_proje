import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { staticPageMetadata } from "@/lib/seo";
import { BlogListView } from "./blog-list-view";

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
  return <BlogListView locale={locale} page={1} />;
}
