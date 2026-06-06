import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
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
        <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
