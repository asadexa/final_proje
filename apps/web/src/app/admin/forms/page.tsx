"use client";

import Link from "next/link";
import { type ReactElement, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

interface FormDef {
  id: string;
  key: string;
  name: string;
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
      <h1 className="mb-6 text-2xl font-bold text-dark">Formlar</h1>
      <div className="space-y-3">
        {forms.map((f) => (
          <Link
            key={f.id}
            href={`/admin/forms/${f.key}`}
            className="flex items-center justify-between rounded-lg border border-line bg-surface p-4 hover:border-primary"
          >
            <span className="font-medium text-dark">{f.name}</span>
            <span className="text-sm text-muted">/{f.key} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
