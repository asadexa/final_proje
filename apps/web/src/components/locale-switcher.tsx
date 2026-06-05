"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LOCALES = ["tr", "en"] as const;

export function LocaleSwitcher({ current }: { current: string }) {
  const pathname = usePathname();

  function localizedHref(target: string): string {
    const parts = pathname.split("/");
    if (parts.length > 1 && (LOCALES as readonly string[]).includes(parts[1] ?? "")) {
      parts[1] = target;
      return parts.join("/") || `/${target}`;
    }
    return `/${target}`;
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-primary"
      >
        {current.toUpperCase()}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 4L6 7.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="invisible absolute right-0 top-full z-50 mt-1 min-w-[80px] rounded-md border border-line bg-surface py-1 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
        {LOCALES.map((l) => (
          <Link
            key={l}
            href={localizedHref(l)}
            className={`block px-3 py-1.5 text-sm ${
              l === current ? "text-primary" : "text-ink-soft hover:bg-surface-muted hover:text-primary"
            }`}
          >
            {l.toUpperCase()}
          </Link>
        ))}
      </div>
    </div>
  );
}
