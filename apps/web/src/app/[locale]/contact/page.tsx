import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { staticPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return staticPageMetadata({
    locale,
    segment: "/contact",
    title: dict.cta.contact,
    description:
      locale === "tr"
        ? "Demo talebi ve sorulariniz icin Kron ile iletisime gecin."
        : "Get in touch with Kron for demo requests and questions.",
  });
}

// Faz 6'da: demo/iletisim formu + client+server validasyon + KVKK + spam korumasi.
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-dark">{dict.cta.contact}</h1>
      <p className="mt-4 text-ink-soft">
        {locale === "tr"
          ? "Demo talebi ve sorularınız için iletişim formu yakında burada olacak."
          : "A contact form for demo requests and questions will be available here soon."}
      </p>
    </div>
  );
}
