"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { logout } from "@/lib/admin";

export function AdminTopbar(): ReactElement {
  const pathname = usePathname();
  const onLogin = pathname === "/admin/login";
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1140px] items-center gap-6 px-4 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-dark">
          <span className="rounded bg-primary px-2 py-0.5 text-sm text-white">Kron</span>
          <span className="text-sm">Admin</span>
        </Link>
        {!onLogin && (
          <>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin"
                className={
                  pathname === "/admin" || pathname.startsWith("/admin/entries")
                    ? "font-medium text-primary"
                    : "text-ink-soft hover:text-primary"
                }
              >
                İçerikler
              </Link>
              <Link
                href="/admin/media"
                className={
                  pathname.startsWith("/admin/media")
                    ? "font-medium text-primary"
                    : "text-ink-soft hover:text-primary"
                }
              >
                Medya
              </Link>
              <Link
                href="/admin/forms"
                className={
                  pathname.startsWith("/admin/forms")
                    ? "font-medium text-primary"
                    : "text-ink-soft hover:text-primary"
                }
              >
                Formlar
              </Link>
              <Link
                href="/admin/redirects"
                className={
                  pathname.startsWith("/admin/redirects")
                    ? "font-medium text-primary"
                    : "text-ink-soft hover:text-primary"
                }
              >
                Yönlendirmeler
              </Link>
              <Link
                href="/admin/audit"
                className={
                  pathname.startsWith("/admin/audit")
                    ? "font-medium text-primary"
                    : "text-ink-soft hover:text-primary"
                }
              >
                Denetim
              </Link>
            </nav>
            <button
              type="button"
              onClick={logout}
              className="ml-auto text-sm text-ink-soft transition-colors hover:text-primary"
            >
              Çıkış
            </button>
          </>
        )}
      </div>
    </header>
  );
}
