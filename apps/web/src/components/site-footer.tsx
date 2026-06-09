import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";

type FLink = { label: string; href: string };

function FooterCol({ title, items }: { title: string; items: FLink[] }) {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <Link href={i.href} className="text-white/65 transition-colors hover:text-white">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`;
  const tr = locale === "tr";
  const year = new Date().getFullYear();

  const products: FLink[] = [
    { label: "Kron PAM", href: `${base}/kron-pam` },
    { label: "AAA Server", href: `${base}/aaa` },
    { label: "IPDR Logging", href: `${base}/ipdr-logging` },
    { label: "Quality Assurance", href: `${base}/quality-assurance` },
    { label: "Telemetry Pipeline", href: `${base}/telemetry-pipeline` },
  ];
  const sectors: FLink[] = [
    { label: tr ? "Enerji" : "Energy", href: `${base}/energy` },
    { label: tr ? "Finans" : "Finance", href: `${base}/finance` },
    { label: tr ? "Kamu" : "Government", href: `${base}/government` },
    { label: tr ? "Telekom" : "Telecom", href: `${base}/telecom` },
  ];
  const about: FLink[] = [
    { label: tr ? "Yönetim" : "Management", href: `${base}/management` },
    { label: tr ? "Kariyer" : "Careers", href: `${base}/human-resources` },
    { label: "Newsroom", href: `${base}/newsroom` },
    { label: tr ? "Ödüller" : "Awards", href: `${base}/awards` },
  ];
  const social: FLink[] = [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/krontech" },
    { label: "X", href: "https://x.com/kron_tech" },
    { label: "Instagram", href: "https://www.instagram.com/kron.tech/" },
    { label: "YouTube", href: "https://www.youtube.com/@krontech" },
  ];

  return (
    <footer className="mt-20">
      {/* Footer ustu mavi bar */}
      <div className="h-1.5 w-full bg-primary" />

      <div className="bg-[#0a1733] text-white">
        <div className="mx-auto max-w-[1140px] px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-5">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kron-logo-light.png" alt="Kron Technologies" className="h-8 w-auto" />
              <p className="mt-4 max-w-xs text-sm text-white/60">{dict.footer.tagline}</p>
            </div>
            <FooterCol title={dict.nav.products} items={products} />
            <FooterCol title={dict.footer.sectors} items={sectors} />
            <FooterCol title={dict.nav.about} items={about} />
            <div>
              <p className="mb-4 text-sm font-semibold text-white">{dict.footer.social}</p>
              <ul className="space-y-2.5 text-sm">
                {social.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/65 transition-colors hover:text-white"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Alt bar: copyright + yasal */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1140px] flex-col gap-3 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© 2007 - {year} Kron. {dict.footer.rights}</p>
            <nav className="flex flex-wrap gap-4">
              <Link href={`${base}/privacy-policy`} className="hover:text-white">
                {tr ? "Gizlilik Politikası" : "Privacy Policy"}
              </Link>
              <Link href={`${base}/cookie-policy`} className="hover:text-white">
                {tr ? "Çerez Politikası" : "Cookie Policy"}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
