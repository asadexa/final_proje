import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/resources">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return staticPageMetadata({
    locale,
    segment: "/resources",
    title: dict.nav.resources,
    description:
      locale === "tr"
        ? "Datasheet, vaka çalışması, blog ve podcast — Kron siber güvenlik kaynakları."
        : "Datasheets, case studies, blog and podcast — Kron cybersecurity resources.",
  });
}

export default async function ResourcesPage({ params }: PageProps<"/[locale]/resources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const tr = locale === "tr";
  const base = `/${locale}`;

  const cards = [
    {
      title: tr ? "Datasheet'ler" : "Datasheets",
      desc: tr
        ? "Ürünlerin teknik özet ve özellik dökümanları."
        : "Technical briefs and feature sheets for the products.",
      href: `${base}/kron-pam-resources`,
    },
    {
      title: tr ? "Vaka Çalışmaları" : "Case Studies",
      desc: tr
        ? "Gerçek kurumlarda PAM ve veri güvenliği başarı hikâyeleri."
        : "Real-world PAM and data security success stories.",
      href: `${base}/case-studies`,
    },
    {
      title: "Blog",
      desc: tr
        ? "Erişim ve siber güvenlik üzerine güncel yazılar."
        : "Latest articles on access and cybersecurity.",
      href: `${base}/blog`,
    },
    {
      title: "Podcast",
      desc: tr
        ? "Ayrıcalıklı erişim yönetimi üzerine sohbetler."
        : "Conversations on privileged access management.",
      href: `${base}/podcast`,
    },
  ];

  return (
    <div>
      <section className="bg-[#0a1733] text-white">
        <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            {tr ? "Kaynaklar" : "Resources"}
          </p>
          <h1 className="text-4xl font-bold md:text-5xl">{dict.nav.resources}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            {tr
              ? "Kron'un siber güvenlik, veri güvenliği ve altyapı çözümleri hakkında datasheet, vaka çalışması, blog ve podcast içeriklerini keşfedin."
              : "Explore datasheets, case studies, blog posts and podcasts about Kron's cybersecurity, data security and infrastructure solutions."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-lg border border-line bg-surface p-8 transition hover:border-primary hover:shadow-sm"
            >
              <h2 className="text-xl font-semibold text-dark group-hover:text-primary">{c.title}</h2>
              <p className="mt-2 text-ink-soft">{c.desc}</p>
              <span className="mt-4 inline-block text-sm font-medium text-primary">
                {tr ? "İncele" : "Explore"} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
