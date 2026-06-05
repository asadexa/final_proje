import Link from "next/link";
import type { ReactElement } from "react";
import type { Dictionary, Locale } from "@/lib/i18n";
import { NAV } from "@/lib/nav";
import { LocaleSwitcher } from "./locale-switcher";

function Caret(): ReactElement {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 4L6 7.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14L17.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }): ReactElement {
  const base = `/${locale}`;

  return (
    <>
      {/* Ust duyuru bari (krontech: mavi gradient + sagda Register) */}
      <div
        className="text-white"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%), #1563FF" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <span className="mr-auto text-sm">{dict.announcement.text}</span>
          <Link
            href={`${base}/contact`}
            className="flex h-14 shrink-0 items-center px-6 text-sm font-medium text-white"
            style={{ background: "rgba(0,40,120,0.6)" }}
          >
            {dict.announcement.cta}
          </Link>
        </div>
      </div>

      {/* Ana header (sticky) */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href={base} aria-label="Kron Technologies" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kron-logo.png" alt="Kron Technologies" className="h-9 w-auto" />
          </Link>

          {/* Nav (lg+) */}
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) => {
              const label = dict.nav[item.key];

              if (!item.children) {
                return (
                  <Link
                    key={item.key}
                    href={`${base}/${item.slug}`}
                    className="group relative flex h-16 items-center text-sm font-medium text-ink-soft transition-colors hover:text-primary"
                  >
                    {label}
                    <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
                  </Link>
                );
              }

              return (
                <div key={item.key} className="group relative">
                  <button
                    type="button"
                    className="flex h-16 items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-primary"
                  >
                    {label}
                    <Caret />
                    <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100" />
                  </button>

                  {/* Dropdown */}
                  <div className="invisible absolute left-0 top-full z-50 min-w-[260px] translate-y-1 rounded-md border border-line bg-surface p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {item.children.map((child) =>
                      child.href ? (
                        <a
                          key={child.label}
                          href={child.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-surface-muted hover:text-primary"
                        >
                          {child.label}
                        </a>
                      ) : (
                        <Link
                          key={child.label}
                          href={`${base}/${child.slug}`}
                          className="block rounded px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-surface-muted hover:text-primary"
                        >
                          {child.label}
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sag: arama + dil */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label={dict.search}
              className="text-ink-soft transition-colors hover:text-primary"
            >
              <SearchIcon />
            </button>
            <LocaleSwitcher current={locale} />
          </div>
        </div>
      </header>
    </>
  );
}
