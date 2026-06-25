"use client";

import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { LoadError } from "@/components/admin/load-error";
import { adminRequest } from "@/lib/admin";
import { useAdminGuard } from "@/lib/use-admin-guard";
import type { EntryList } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default function AdminEntriesPage(): ReactElement {
  const ready = useAdminGuard();
  const [list, setList] = useState<EntryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const r = await adminRequest<EntryList>("/admin/entries?pageSize=100");
    if (r.ok) setList(r.data ?? null);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    if (ready) void Promise.resolve().then(load);
  }, [ready, load]);

  if (loading) return <p className="text-sm text-muted">Yukleniyor...</p>;
  if (error) return <LoadError onRetry={() => void load()} label="İçerikler yüklenemedi — sunucuya ulaşılamadı." />;
  const items = list?.items ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">İçerikler</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{items.length} kayıt</span>
          <Link
            href="/admin/entries/new"
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            + Yeni içerik
          </Link>
        </div>
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
