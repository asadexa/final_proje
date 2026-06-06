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
      <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between px-4 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-dark">
          <span className="rounded bg-primary px-2 py-0.5 text-sm text-white">Kron</span>
          <span className="text-sm">Admin</span>
        </Link>
        {!onLogin && (
          <button
            type="button"
            onClick={logout}
            className="text-sm text-ink-soft transition-colors hover:text-primary"
          >
            Çıkış
          </button>
        )}
      </div>
    </header>
  );
}
