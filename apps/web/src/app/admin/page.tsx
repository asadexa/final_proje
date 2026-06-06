"use client";

import Link from "next/link";
import { type ReactElement, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";
import type { EntryList } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default function AdminEntriesPage(): ReactElement {
  const [list, setList] = useState<EntryList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void adminFetch<EntryList>("/admin/entries?pageSize=100").then((d) => {
      setList(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted">Yukleniyor...</p>;
  const items = list?.items ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">İçerikler</h1>
        <span className="text-sm text-muted">{items.length} kayıt</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Başlık</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Dil</th>
              <th className="px-4 py-3 font-medium">Slug</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-surface-muted">
                <td className="px-4 py-3 font-medium text-dark">
                  <Link href={`/admin/entries/${it.id}`} className="hover:text-primary">
                    {it.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{it.type}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[it.status ?? "DRAFT"] ?? ""}`}
                  >
                    {it.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">{it.localeCode}</td>
                <td className="px-4 py-3 text-muted">{it.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
