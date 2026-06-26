"use client";

import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { LoadError } from "@/components/admin/load-error";
import { adminRequest } from "@/lib/admin";
import { useAdminGuard } from "@/lib/use-admin-guard";

interface FormDef {
  id: string;
  key: string;
  name: string;
  enabled?: boolean;
}

export default function FormsListPage(): ReactElement {
  const ready = useAdminGuard();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const r = await adminRequest<FormDef[]>("/admin/forms");
    if (r.ok) setForms(r.data ?? []);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    if (ready) void Promise.resolve().then(load);
  }, [ready, load]);

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;
  if (error)
    return <LoadError onRetry={() => void load()} label="Formlar yüklenemedi — sunucuya ulaşılamadı." />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Formlar</h1>
        <Link
          href="/admin/forms/new"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + Yeni Form
        </Link>
      </div>
      <div className="space-y-3">
        {forms.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-lg border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-dark">{f.name}</span>
              {f.enabled === false && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-muted">pasif</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href={`/admin/forms/${f.key}/edit`} className="text-primary hover:underline">
                Tanımı düzenle
              </Link>
              <Link href={`/admin/forms/${f.key}`} className="text-ink-soft hover:text-primary">
                Gönderimler /{f.key} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
