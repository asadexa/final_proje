"use client";

import { type ReactElement, useEffect, useState } from "react";

// Sticky + acilir-kapanir (hamburger) Icindekiler — krontech blog TOC modern hali.
// h2 listesi server'da (PostArticle) uretilir; burada sadece etkilesim:
// toggle, sticky konum ve scroll-spy ile aktif bolum vurgusu.
export function BlogToc({
  toc,
  locale,
}: {
  toc: Array<{ id: string; text: string }>;
  locale: string;
}): ReactElement {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<string>(toc[0]?.id ?? "");
  const label = locale === "tr" ? "İçindekiler" : "Table of Contents";

  useEffect(() => {
    // Scroll-spy: gorunur ilk basligi aktif say (ust header + TOC payi icin rootMargin).
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );
    for (const t of toc) {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [toc]);

  return (
    <nav
      aria-label={label}
      className="sticky top-20 z-10 mb-6 overflow-hidden rounded-lg border border-line bg-surface-muted"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-dark hover:bg-surface"
      >
        <span>{label}</span>
        {/* liste/hamburger ikonu (acikken vurgulu) */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className={open ? "text-primary" : "text-ink-soft"}
        >
          <circle cx="2.5" cy="4" r="1.2" fill="currentColor" />
          <circle cx="2.5" cy="9" r="1.2" fill="currentColor" />
          <circle cx="2.5" cy="14" r="1.2" fill="currentColor" />
          <path
            d="M6 4h10M6 9h10M6 14h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <ol className="space-y-1 border-t border-line px-4 py-3 text-sm">
          {toc.map((t, i) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className={`block transition-colors hover:text-primary ${
                  active === t.id ? "font-medium text-primary" : "text-ink-soft"
                }`}
              >
                {i + 1}. {t.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
