"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { LoadError } from "@/components/admin/load-error";
import { adminDownload, adminFetch, adminRequest } from "@/lib/admin";
import { useAdminGuard } from "@/lib/use-admin-guard";

interface FieldDef {
  name: string;
  label?: string;
}
interface Submission {
  id: string;
  status: string;
  consent: boolean;
  createdAt: string;
  data: Record<string, unknown>;
}
interface SubList {
  items: Submission[];
  total: number;
  fields: FieldDef[];
}

const STATUSES = ["NEW", "READ", "SPAM", "ARCHIVED"];

export default function FormSubmissionsPage(): ReactElement {
  const key = (useParams().key as string) ?? "";
  const ready = useAdminGuard();
  const [list, setList] = useState<SubList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const r = await adminRequest<SubList>(`/admin/forms/${key}/submissions?pageSize=100`);
    if (r.ok) setList(r.data ?? null);
    else setError(true);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    if (ready) void Promise.resolve().then(load);
  }, [ready, load]);

  async function setStatus(id: string, status: string): Promise<void> {
    await adminFetch(`/admin/forms/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;
  if (error)
    return <LoadError onRetry={() => void load()} label="Gönderimler yüklenemedi — sunucuya ulaşılamadı." />;
  const fields = list?.fields ?? [];
  const items = list?.items ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/forms" className="text-sm text-ink-soft hover:text-primary">
            ← Formlar
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-dark">
            {key} <span className="text-base font-normal text-muted">({items.length})</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            adminDownload(`/admin/forms/${key}/submissions/export`, `${key}-submissions.csv`)
          }
          className="rounded border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary"
        >
          CSV indir
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">Henüz gönderim yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Tarih</th>
                <th className="px-3 py-2 font-medium">Durum</th>
                {fields.map((f) => (
                  <th key={f.name} className="px-3 py-2 font-medium">
                    {f.label ?? f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((s) => (
                <tr key={s.id} className={s.status === "SPAM" ? "opacity-50" : ""}>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.status}
                      onChange={(e) => setStatus(s.id, e.target.value)}
                      className="rounded border border-line px-1 py-0.5 text-xs"
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  {fields.map((f) => (
                    <td key={f.name} className="px-3 py-2 text-ink-soft">
                      {String(s.data?.[f.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
