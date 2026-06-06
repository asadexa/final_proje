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
        ? "Datasheet, vaka calismasi ve teknik dokumanlar."
        : "Datasheets, case studies and technical documents.",
  });
}

export default async function ResourcesPage({ params }: PageProps<"/[locale]/resources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const tr = locale === "tr";
  const intro = tr
    ? "Erişim güvenliği, veri koruma ve telekom üzerine kaynaklar — blog, veri sayfaları, vaka çalışmaları ve daha fazlası."
    : "Resources on access security, data protection and telecom — blog, datasheets, case studies and more.";
  const cards = tr
    ? [
        { title: "Blog & İçgörüler", desc: "Sıfır Güven, PAM ve veri güvenliği yazıları.", href: `/${locale}/blog` },
        { title: "Veri Sayfaları", desc: "Ürün datasheet'leri için bizimle iletişime geçin.", href: `/${locale}/contact` },
        { title: "Vaka Çalışmaları", desc: "Bankacılık ve telekom başarı hikayeleri.", href: `/${locale}/contact` },
        { title: "Webinar & Podcast", desc: "Kron CyberPulse ve canlı oturumlar.", href: `/${locale}/blog` },
      ]
    : [
        { title: "Blog & Insights", desc: "Articles on Zero Trust, PAM and data security.", href: `/${locale}/blog` },
        { title: "Datasheets", desc: "Get in touch for product datasheets.", href: `/${locale}/contact` },
        { title: "Case Studies", desc: "Banking and telecom success stories.", href: `/${locale}/contact` },
        { title: "Webinars & Podcast", desc: "Kron CyberPulse and live sessions.", href: `/${locale}/blog` },
      ];

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-dark">{dict.nav.resources}</h1>
      <p className="mb-10 mt-3 max-w-2xl text-ink-soft">{intro}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="rounded-lg border border-line bg-surface p-6 transition hover:border-primary hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-dark">{c.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{c.desc}</p>
            <span className="mt-4 inline-block text-sm font-medium text-primary">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
