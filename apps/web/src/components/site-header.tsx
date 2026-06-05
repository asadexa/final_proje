import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`;
  const nav = [
    { href: `${base}/kron-pam`, label: dict.nav.products },
    { href: `${base}/blog`, label: dict.nav.blog },
    { href: `${base}/resources`, label: dict.nav.resources },
    { href: `${base}/contact`, label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo (gercek Kron logosu) */}
        <Link href={base} aria-label="Kron Technologies" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kron-logo.png" alt="Kron Technologies" className="h-9 w-auto" />
        </Link>

        {/* Nav: hover'da yazi mavi + altta buyuyen mavi cubuk */}
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="group relative flex h-16 items-center text-sm font-medium text-ink-soft transition-colors hover:text-primary"
            >
              {n.label}
              <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher current={locale} />
          <Link
            href={`${base}/contact`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            {dict.cta.demo}
          </Link>
        </div>
      </div>
    </header>
  );
}
