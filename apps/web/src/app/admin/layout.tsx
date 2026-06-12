import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CommandPalette } from "@/components/admin/command-palette";
import { IdleLogout } from "@/components/admin/idle-logout";
import "../globals.css";

// Admin paneli kendi kok layout'u (public header/footer YOK, locale YOK, noindex).
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kron Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="tr" className={`${roboto.variable} h-full`}>
      <body className="min-h-full bg-surface-muted font-sans text-ink antialiased">
        <AdminTopbar />
        {/* Ctrl+K global komut paleti */}
        <CommandPalette />
        {/* 15 dk hareketsizlikte sessiz logout (yuksek-yetkili panel sertlestirmesi) */}
        <IdleLogout />
        <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
