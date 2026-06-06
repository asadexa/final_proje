import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary, isLocale, LOCALES } from "@/lib/i18n";
import { organizationJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import "../globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Site geneli varsayilan metadata (sayfalar generateMetadata ile gecersiz kilar).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Privileged Access Management & Data Security`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Enterprise cybersecurity and telecom: Privileged Access Management (PAM), data security and AAA/IPDR solutions.",
  openGraph: { siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${roboto.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-surface font-sans text-ink antialiased">
        <SiteHeader locale={locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale} dict={dict} />
        <JsonLd data={organizationJsonLd()} />
      </body>
    </html>
  );
}
