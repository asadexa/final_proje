import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/blocks";
import { PageBanner } from "@/components/page-banner";
import { getEntry } from "@/lib/api";
import { getDictionary, isLocale } from "@/lib/i18n";
import { metadataFromEntry, staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/resources">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  // CMS entry'si varsa SEO alanlari oradan gelir (yonetilebilir icerik).
  const entry = await getEntry(locale, "resources");
  if (entry) return metadataFromEntry(entry, locale, `/${locale}/resources`);
  const dict = getDictionary(locale);
  return staticPageMetadata({
    locale,
    segment: "/resources",
    title: dict.nav.resources,
    description:
      locale === "tr"
        ? "Datasheet, vaka çalışması ve blog — Kron siber güvenlik kaynakları."
        : "Datasheets, case studies and blog — Kron cybersecurity resources.",
  });
}

// Kaynaklar — krontech /resources birebir. Icerik CMS'TEN gelir: slug
// 'resources' PAGE entry'si (RESOURCE_HUB blogu) admin'den duzenlenebilir.
// Entry yoksa (seed'lenmemis ortam) asagidaki statik yedege zarifce duser —
// gorunum iki yolda da AYNI (ayni bilesen/siniflar).
export default async function ResourcesPage({ params }: PageProps<"/[locale]/resources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const entry = await getEntry(locale, "resources");
  if (entry && entry.blocks.length > 0) {
    return <Blocks blocks={entry.blocks} locale={locale} />;
  }

  const dict = getDictionary(locale);
  const tr = locale === "tr";

  const intro = tr
    ? {
        h2: "Kaynaklar",
        p: "Kron'un üst düzey telekom ve siber güvenlik teknolojileri hakkında daha fazla bilgi edinmek için case study'lerimizi, blog'larımızı ve datasheet'lerimizi inceleyin.",
      }
    : {
        h2: "Cybersecurity Resources",
        p: "Explore our cybersecurity library of webinars, case studies, and datasheets to learn more about Kron's high-end Privileged Access Management solutions.",
      };

  const cards = [
    {
      img: "/kron/pages/resources/card-case-studies.jpg",
      title: tr ? "CASE STUDY'LER" : "CASE STUDIES",
      desc: tr
        ? "Kron'un Ayrıcalıklı Erişim Yönetimi case study'leri ile hassas verilerinizi ve kritik sistemlerinize erişen ayrıcalıklı hesapları nasıl koruyacağınızı öğrenin."
        : "Find out how to protect your sensitive data and critical systems with Kron's Privileged Access Management case studies.",
      href: `/${locale}/case-studies`,
    },
    {
      img: "/kron/pages/resources/card-datasheets.jpg",
      title: tr ? "DATASHEET'LER" : "DATASHEETS",
      desc: tr
        ? "Kron'un dünyanın önde gelen Ayrıcalıklı Erişim Yönetimi ürünü hakkında daha fazla bilgi almak için şimdi datasheet'leri inceleyin."
        : "Uncover the datasheets of Kron's world-leading Privileged Access Management suite.",
      href: `/${locale}/kron-pam-resources`,
    },
    {
      img: "/kron/pages/resources/card-blog.jpg",
      title: "BLOG",
      desc: tr
        ? "Bilişim teknolojilerindeki gelişmeler, siber güvenlik alanındaki trendler, erişim ve veri güvenliği hakkında detaylar en güncel haliyle Kron Blog'da."
        : "Details on latest news in information technologies, trends in cyber security, access and data security are on the Kron Blog in its most up-to-date form.",
      href: `/${locale}/blog`,
    },
  ];
  const more = tr ? "Detaylı Bilgi" : "Discover More";

  return (
    <div>
      <PageBanner
        title={dict.nav.resources}
        image="/kron/pages/resources/banner.jpg"
        crumbs={[tr ? "Ana Sayfa" : "Home", dict.nav.resources]}
      />

      <section className="mt-10 text-center">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
          <h2 className="mb-3 text-[2rem] font-medium text-dark">{intro.h2}</h2>
          <p className="mx-auto max-w-3xl text-ink-soft">{intro.p}</p>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
          <div className="grid gap-8 px-4 md:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.title}
                className="kron-notch mt-4 flex h-full flex-col bg-surface p-5 shadow-[0_6px_12px_-4px_rgba(37,38,41,0.12)]"
              >
                {/* gorsel kart kenarina tasar (krontech -20px margin + gradyan) */}
                <div className="kron-gradient-img -mx-5 -mt-5">
                  <Image src={c.img} alt={c.title} width={700} height={340} className="h-auto w-full" />
                </div>
                {/* krontech h4 baslik = link rengi (mavi), bold */}
                <h4 className="mt-5 text-2xl font-bold text-primary">
                  {c.href ? (
                    <Link href={c.href} className="hover:underline">
                      {c.title}
                    </Link>
                  ) : (
                    c.title
                  )}
                </h4>
                <p className="mt-3 text-ink-soft">{c.desc}</p>
                {/* buton her zaman kartin altina hizalanir (orta kart kaymasi cozumu) */}
                <div className="mt-auto pt-5">
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="inline-block rounded-none border-2 border-primary px-[30px] py-2.5 text-[15px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      {more}
                    </Link>
                  ) : (
                    <span className="inline-block cursor-default rounded-none border-2 border-primary px-[30px] py-2.5 text-[15px] font-medium text-primary">
                      {more}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
