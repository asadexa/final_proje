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
    <div className="flex items-center gap-2 text-sm font-medium">
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={localizedHref(l)}
          className={l === current ? "text-primary" : "text-muted hover:text-ink"}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
