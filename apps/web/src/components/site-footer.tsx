import Link from "next/link";
import type { ReactElement } from "react";
import {
  FOOTER_COLUMNS,
  FOOTER_LEGAL,
  SOCIALS,
  type FooterColumn,
  type FooterLink,
  type SocialIconName,
} from "@/lib/footer";
import type { Dictionary, Locale } from "@/lib/i18n";

// krontech sosyal ikonlari (FontAwesome yerine inline SVG — sifir bagimlilik).
function SocialIcon({ name }: { name: SocialIconName }): ReactElement {
  const p: Record<SocialIconName, string> = {
    linkedin:
      "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.25 8h4.5v15.5H.25V8zm7.25 0h4.31v2.12h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9v8.82h-4.5v-7.82c0-1.87-.03-4.27-2.6-4.27-2.6 0-3 2.03-3 4.13v7.96H7.5V8z",
    x: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L6.99 4.13H5.03l12.05 15.64z",
    instagram:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 12 8a4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z",
    youtube:
      "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7l6.5 3.5-6.5 3.5z",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={p[name]} />
    </svg>
  );
}

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }): ReactElement {
  const base = `/${locale}`;
  const year = new Date().getFullYear();

  // krontech link stili: 13px, beyaz %50, hover mavi.
  const linkCls =
    "text-[13px] leading-[19.5px] text-white/50 transition-colors hover:text-primary";

  const titleFor = (key: FooterColumn["titleKey"]): string =>
    key === "products" ? dict.nav.products : key === "about" ? dict.nav.about : dict.footer.sectors;

  const renderLink = (l: FooterLink, cls: string): ReactElement =>
    l.href ? (
      <a href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {l.label}
      </a>
    ) : (
      <Link href={`${base}/${l.slug ?? ""}`} className={cls}>
        {l.label}
      </Link>
    );

  return (
    <footer className="mt-20">
      {/* Ana footer — krontech: bg #000, pt 50px, beyaz metin */}
      <div className="bg-black pt-[50px] text-white">
        <div className="mx-auto max-w-[1140px] px-4 pb-12 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row">
            {/* Logo (sol — col-md-4) */}
            <div className="lg:w-1/3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kron-logo-light.svg" alt="Kron Technologies" className="h-9 w-auto" />
            </div>

            {/* 4 kolon (sag — col-md-8) */}
            <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.titleKey}>
                  <p className="mb-4 text-base font-semibold leading-6 text-white">
                    {titleFor(col.titleKey)}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>{renderLink(l, linkCls)}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Social Media kolonu */}
              <div>
                <p className="mb-4 text-base font-semibold leading-6 text-white">
                  {dict.footer.social}
                </p>
                <ul className="space-y-3">
                  {SOCIALS.map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-3 ${linkCls}`}
                      >
                        <SocialIcon name={s.icon} />
                        <span>{s.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subfooter — krontech: bg #0f1010, telif + yasal linkler */}
      <div className="bg-[#0f1010] text-white/50">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-3 px-4 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © 2007 - {year} Kron. {dict.footer.rights}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LEGAL.map((l) => (
              <span key={l.label}>{renderLink(l, "transition-colors hover:text-white")}</span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
