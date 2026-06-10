"use client";

import { type FormEvent, type ReactElement, useCallback, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

interface RedirectRow {
  id: string;
  source: string;
  destination: string;
  statusCode: number;
  enabled: boolean;
  createdAt: string;
}

const inputCls =
  "w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

// 301/302 yonetimi (PDF SEO gereksinimi). Degisiklik API'de Redis cache'i dusurur;
// web proxy'nin in-memory cache'i <=60sn icinde tazelenir.
export default function RedirectsPage(): ReactElement {
  const [rows, setRows] = useState<RedirectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const d = await adminFetch<RedirectRow[]>("/admin/redirects");
    setRows(d ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    void Promise.resolve().then(load);
  }, [load]);

  async function create(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMsg("");
    const created = await adminFetch<RedirectRow>("/admin/redirects", {
      method: "POST",
      body: JSON.stringify({
        source: fd.get("source"),
        destination: fd.get("destination"),
        statusCode: Number(fd.get("statusCode") ?? 301),
      }),
    });
    if (created) {
      form.reset();
      setMsg("Eklendi.");
      await load();
    } else {
      setMsg("Hata: kaynak '/' ile başlamalı ve benzersiz olmalı.");
    }
  }

  async function toggle(r: RedirectRow): Promise<void> {
    await adminFetch(`/admin/redirects/${r.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    await load();
  }

  async function remove(r: RedirectRow): Promise<void> {
    if (!window.confirm(`${r.source} silinsin mi?`)) return;
    await adminFetch(`/admin/redirects/${r.id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-dark">Yönlendirmeler</h1>
      <p className="mb-6 text-sm text-ink-soft">
        301/302 yönlendirmeleri (eski URL yapısından geçiş). Değişiklik ~60 sn içinde yayına yansır.
      </p>

      <form onSubmit={create} className="mb-8 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
        <input name="source" placeholder="/eski-url" required className={inputCls} />
        <input name="destination" placeholder="/tr/yeni-url" required className={inputCls} />
        <select name="statusCode" defaultValue="301" className={inputCls}>
          <option value="301">301 kalıcı</option>
          <option value="302">302 geçici</option>
        </select>
        <button
          type="submit"
          className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          Ekle
        </button>
      </form>
      {msg && <p className="mb-4 text-sm text-ink-soft">{msg}</p>}

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="px-4 py-3">Kaynak</th>
              <th className="px-4 py-3">Hedef</th>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{r.source}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.destination}</td>
                <td className="px-4 py-3">{r.statusCode}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggle(r)}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${r.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-muted"}`}
                  >
                    {r.enabled ? "Aktif" : "Pasif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    className="text-xs text-accent hover:underline"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Henüz yönlendirme yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
