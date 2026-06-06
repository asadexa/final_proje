import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
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

// Iletisim/demo formu — client + sunucu validasyon, KVKK onayi, honeypot spam korumasi.
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-3 text-3xl font-bold text-dark">{dict.cta.contact}</h1>
      <p className="mb-8 text-ink-soft">
        {locale === "tr"
          ? "Demo talebi ve sorularınız için formu doldurun; ekibimiz sizinle iletişime geçecek."
          : "Fill in the form for demo requests and questions; our team will get back to you."}
      </p>
      <ContactForm locale={locale} />
    </div>
  );
}
