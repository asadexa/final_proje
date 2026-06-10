"use client";

import Link from "next/link";
import { type ReactElement, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

interface FormDef {
  id: string;
  key: string;
  name: string;
  enabled?: boolean;
}

export default function FormsListPage(): ReactElement {
  const [forms, setForms] = useState<FormDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void adminFetch<FormDef[]>("/admin/forms").then((d) => {
      setForms(d ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;

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
