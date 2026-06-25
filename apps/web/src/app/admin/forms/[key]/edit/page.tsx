"use client";

import { useParams } from "next/navigation";
import { type ReactElement, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin";
import { useAdminGuard } from "@/lib/use-admin-guard";
import { type FieldRow, FormDefEditor } from "../../form-def-editor";

interface FormDef {
  key: string;
  name: string;
  enabled: boolean;
  fields: FieldRow[];
}

export default function EditFormPage(): ReactElement {
  const key = (useParams().key as string) ?? "";
  const ready = useAdminGuard();
  const [def, setDef] = useState<FormDef | null>(null);

  useEffect(() => {
    if (!ready) return;
    void adminFetch<FormDef[]>("/admin/forms").then((list) => {
      const found = (list ?? []).find((f) => f.key === key);
      if (found) setDef(found);
    });
  }, [ready, key]);

  if (!def) return <p className="text-sm text-muted">Yükleniyor...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-dark">Form Düzenle: {def.name}</h1>
      <FormDefEditor mode="edit" initial={def} />
    </div>
  );
}
