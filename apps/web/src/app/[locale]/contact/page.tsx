import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { PageBanner } from "@/components/page-banner";
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

type Office = {
  name: string;
  img: string;
  rows: Array<{ icon: "mail" | "phone" | "fax" | "pin"; label: string; value: string }>;
};

// Ofis bilgileri krontech contact sayfasindan birebir (e-postalar cf-email decode).
// TR/EN sira ve icerik krontech'in kendi yerellestirmesini izler.
function offices(tr: boolean): Office[] {
  const ist = "/kron/pages/contact/office-istanbul.jpg";
  const usa = "/kron/pages/contact/office-usa.jpg";
  const ank = "/kron/pages/contact/office-ankara.jpg";
  const izm = "/kron/pages/contact/office-izmir.jpg";
  if (tr) {
    return [
      { name: "Kron İstanbul", img: ist, rows: [
        { icon: "mail", label: "E-posta", value: "info@kron.com.tr" },
        { icon: "phone", label: "Telefon", value: "+90 (212) 286 51 22" },
        { icon: "fax", label: "Fax", value: "+90 (212) 286 53 43" },
        { icon: "pin", label: "Adres", value: "İ.T.Ü. Ayazağa Kampüsü, Teknokent ARI 3 Binası, No:B401, Maslak, Sarıyer, İstanbul" },
      ] },
      { name: "Kron Ankara", img: ank, rows: [
        { icon: "mail", label: "E-posta", value: "info@kron.com.tr" },
        { icon: "phone", label: "Telefon", value: "+90 (312) 265 06 86" },
        { icon: "fax", label: "Fax", value: "+90 (312) 265 06 87" },
        { icon: "pin", label: "Adres", value: "Bilkent CyberPark, C Blok No: 321 Bilkent, Ankara" },
      ] },
      { name: "Kron İzmir", img: izm, rows: [
        { icon: "mail", label: "E-posta", value: "info@kron.com.tr" },
        { icon: "phone", label: "Telefon", value: "+90 (232) 484 13 97" },
        { icon: "pin", label: "Adres", value: "Akdeniz Mah. 1353 Sk. Armesa İş Merkezi No:2, Konak" },
      ] },
      { name: "Kron ABD", img: usa, rows: [
        { icon: "mail", label: "E-posta", value: "us@krontech.com" },
        { icon: "phone", label: "Telefon", value: "+1-646-869-23-88" },
        { icon: "pin", label: "Adres", value: "3 2nd Street, Suite 201 Jersey City, NJ 07302, USA" },
      ] },
    ];
  }
  return [
    { name: "Kron İstanbul (HQ)", img: ist, rows: [
      { icon: "mail", label: "E-Mail", value: "info@krontech.com" },
      { icon: "phone", label: "Phone", value: "+90 (212) 286 51 22" },
      { icon: "fax", label: "Fax", value: "+90 (212) 286 53 43" },
      { icon: "pin", label: "Address", value: "I.T.U. Ayazaga Kampusu, Teknokent ARI 3 Binasi, No:B401, Maslak, Sariyer, Istanbul" },
    ] },
    { name: "Kron USA", img: usa, rows: [
      { icon: "mail", label: "E-Mail", value: "info_us@krontech.com" },
      { icon: "phone", label: "Phone", value: "+1-201-204-0808" },
      { icon: "pin", label: "Address", value: "3 2nd Street, Suite 201, Jersey City, NJ 07302, USA" },
    ] },
    { name: "Kron Ankara", img: ank, rows: [
      { icon: "mail", label: "E-Mail", value: "info@krontech.com" },
      { icon: "phone", label: "Phone", value: "+90 (312) 265 06 86" },
      { icon: "fax", label: "Fax", value: "+90 (312) 265 06 87" },
      { icon: "pin", label: "Address", value: "Bilkent CyberPark, C Blok No: 321 Bilkent, Ankara, TÜRKİYE" },
    ] },
    { name: "Kron İzmir", img: izm, rows: [
      { icon: "mail", label: "E-Mail", value: "info@krontech.com" },
      { icon: "phone", label: "Phone", value: "+90 (232) 484 13 97" },
      { icon: "pin", label: "Address", value: "Akdeniz Mah. 1353 Sk. Armesa İş Merkezi No:2, Konak" },
    ] },
  ];
}

// kucuk ikonlar (krontech icons-sn.svg sprite karsiligi, #1563ff)
function OfficeIcon({ kind }: { kind: Office["rows"][number]["icon"] }): ReactElement {
  const common = "mt-1 h-4 w-4 shrink-0 text-primary";
  switch (kind) {
    case "mail":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "fax":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden>
          <path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={common} aria-hidden>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
      );
  }
}

// Iletisim — krontech /contact birebir: 226px banner + breadcrumb + buyuk form
// karti (tam alan seti) + 4 ofis (gorsel + bilgi karti, donusumlu yon).
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const tr = locale === "tr";
  const offs = offices(tr);

  return (
    <div>
      <PageBanner
        title={dict.cta.contact}
        image="/kron/pages/contact/banner.jpg"
        crumbs={[tr ? "Ana Sayfa" : "Home", dict.cta.contact]}
      />

      {/* Buyuk form karti (krontech big-from: card p-5, col-10 ortali, mb-80) */}
      <section className="mt-3 mb-20">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
          <div className="mx-auto max-w-[950px] bg-surface p-6 shadow-[0_6px_12px_-4px_rgba(37,38,41,0.12)] md:p-12">
            <h3 className="mb-6 text-[1.75rem] font-medium text-dark">
              {tr ? "Bize Ulaşın" : "Contact Us"}
            </h3>
            <ContactForm locale={locale} />
          </div>
        </div>
      </section>

      {/* Ofisler (krontech contact-list): gorsel + bilgi karti, satir basina donusumlu yon */}
      <section className="my-5 pb-16">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6">
          {offs.map((o, i) => (
            <div key={o.name} className="mb-9 grid md:grid-cols-2">
              <div className={`kron-gradient-img ${i % 2 === 1 ? "md:order-2" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.img} alt={o.name} className="h-full w-full object-cover" />
              </div>
              <div className={`flex flex-col justify-center ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <div className="border border-line bg-surface p-8">
                  <h3 className="mb-4 text-[1.75rem] font-medium text-dark">{o.name}</h3>
                  {o.rows.map((r) => (
                    <p key={r.label + r.value} className="mb-2.5 flex items-start gap-3 text-sm text-ink">
                      <OfficeIcon kind={r.icon} />
                      <span className="shrink-0 text-ink-soft">{r.label}:</span>
                      <span className="ml-auto w-[230px] shrink-0">{r.value}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
