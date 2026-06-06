"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

const TYPES = ["PAGE", "PRODUCT", "POST"];
const LOCALES = ["tr", "en"];

export default function NewEntryPage(): ReactElement {
  const router = useRouter();
  const [type, setType] = useState("POST");
  const [localeCode, setLocaleCode] = useState("tr");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) window.location.href = "/admin/login";
  }, []);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const res = await adminFetch<{ id: string }>("/admin/entries", {
      method: "POST",
      body: JSON.stringify({ type, localeCode, slug, title, status: "DRAFT", blocks: [] }),
    });
    setSaving(false);
    if (res?.id) router.push(`/admin/entries/${res.id}`);
    else setErr("Oluşturulamadı. Slug bu dilde benzersiz mi, alanlar dolu mu kontrol edin.");
  }

  const inputCls = "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/admin" className="text-sm text-ink-soft hover:text-primary">
        ← İçerikler
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold text-dark">Yeni İçerik</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Tip</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Dil</label>
            <select className={inputCls} value={localeCode} onChange={(e) => setLocaleCode(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Başlık</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="İçerik başlığı"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">Slug</label>
          <input
            className={inputCls}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ornek-slug"
            required
          />
        </div>
        {err && <p className="text-sm text-accent">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {saving ? "Oluşturuluyor..." : "Oluştur ve düzenle"}
        </button>
      </form>
    </div>
  );
}
