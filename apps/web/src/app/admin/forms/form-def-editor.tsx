"use client";

import { type ReactElement, useState } from "react";
import { adminFetch } from "@/lib/admin";

export interface FieldRow {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[]; // select tipi icin secenekler
}

const FIELD_TYPES = ["text", "email", "tel", "textarea", "select"];
const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

// Form tanimi editoru (PDF "Form tanimlama"): alan satirlari name/label/tip/zorunlu.
// create modunda POST /admin/forms, edit modunda PATCH /admin/forms/:key.
export function FormDefEditor({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: { key: string; name: string; enabled: boolean; fields: FieldRow[] };
}): ReactElement {
  const [key, setKey] = useState(initial?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [fields, setFields] = useState<FieldRow[]>(
    initial?.fields ?? [{ name: "email", label: "E-posta", type: "email", required: true }],
  );
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function patchField(i: number, p: Partial<FieldRow>): void {
    setFields((prev) => prev.map((f, j) => (j === i ? { ...f, ...p } : f)));
  }
  function moveField(i: number, dir: -1 | 1): void {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setMsg("");
    const body = { name, enabled, fields };
    const res =
      mode === "create"
        ? await adminFetch(`/admin/forms`, { method: "POST", body: JSON.stringify({ key, ...body }) })
        : await adminFetch(`/admin/forms/${initial?.key}`, { method: "PATCH", body: JSON.stringify(body) });
    setSaving(false);
    if (res) {
      window.location.href = "/admin/forms";
    } else {
      setMsg("Hata: key benzersiz/kebab-case ve alan adları geçerli olmalı.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Key (URL anahtarı)</label>
          <input
            className={inputCls}
            value={key}
            disabled={mode === "edit"}
            placeholder="newsletter"
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Ad</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Aktif (kapatılırsa public submit 404 döner)
      </label>

      <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark">Alanlar</h2>
          <button
            type="button"
            onClick={() => setFields((p) => [...p, { name: "", label: "", type: "text", required: false }])}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Alan ekle
          </button>
        </div>
        {fields.map((f, i) => (
          <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_120px_90px_auto]">
            <input
              className={inputCls}
              placeholder="name (data anahtarı)"
              value={f.name}
              onChange={(e) => patchField(i, { name: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Etiket"
              value={f.label}
              onChange={(e) => patchField(i, { label: e.target.value })}
            />
            <select
              className={inputCls}
              value={f.type}
              onChange={(e) => patchField(i, { type: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => patchField(i, { required: e.target.checked })}
              />
              zorunlu
            </label>
            {f.type === "select" && (
              <input
                className={`${inputCls} sm:col-span-4`}
                placeholder="Seçenekler (virgülle ayırın): Evet, Hayır"
                value={(f.options ?? []).join(", ")}
                onChange={(e) =>
                  patchField(i, {
                    options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            )}
            <div className="flex gap-1 text-xs">
              <button type="button" onClick={() => moveField(i, -1)} className="rounded border border-line px-2 py-1 hover:border-primary">↑</button>
              <button type="button" onClick={() => moveField(i, 1)} className="rounded border border-line px-2 py-1 hover:border-primary">↓</button>
              <button
                type="button"
                onClick={() => setFields((p) => p.filter((_, j) => j !== i))}
                className="rounded border border-line px-2 py-1 text-accent hover:border-accent"
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg && <p className="text-sm text-accent">{msg}</p>}
      <button
        type="button"
        disabled={saving || !name || (mode === "create" && !key)}
        onClick={() => void save()}
        className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}
