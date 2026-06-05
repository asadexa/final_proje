import Link from "next/link";
import type { Dictionary, Locale } from "@/lib/i18n";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20">
      {/* Footer ustu mavi bar (krontech) */}
      <div className="h-1.5 w-full bg-primary" />

      <div className="bg-surface-muted">
        <div className="mx-auto max-w-[1140px] px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kron-logo.png" alt="Kron Technologies" className="h-8 w-auto" />
              <p className="mt-3 max-w-sm text-sm text-muted">{dict.footer.tagline}</p>
            </div>
            <nav className="flex flex-wrap gap-6 text-sm text-ink-soft">
              <Link href={`/${locale}/kron-pam`} className="hover:text-primary">
                {dict.nav.products}
              </Link>
              <Link href={`/${locale}/blog`} className="hover:text-primary">
                {dict.nav.blog}
              </Link>
              <Link href={`/${locale}/resources`} className="hover:text-primary">
                {dict.nav.resources}
              </Link>
              <Link href={`/${locale}/contact`} className="hover:text-primary">
                {dict.nav.contact}
              </Link>
            </nav>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-xs text-muted">
            © {year} Kron Technologies. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
