"use client";

import { type ReactElement, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

interface AuditRow {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
}

const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium" });

// Denetim kaydi (PDF "Audit log"): kim, ne zaman, hangi icerige ne yapti.
export default function AuditPage(): ReactElement {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void adminFetch<AuditRow[]>("/admin/audit?pageSize=100").then((d) => {
      setRows(d ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Denetim Kaydı</h1>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">Zaman</th>
              <th className="px-4 py-3">Aksiyon</th>
              <th className="px-4 py-3">Varlık</th>
              <th className="px-4 py-3">Detay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {fmt.format(new Date(r.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {r.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.entityType}/{r.entityId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                  {r.meta ? JSON.stringify(r.meta) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
