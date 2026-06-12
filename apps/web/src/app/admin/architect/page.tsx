"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useState } from "react";
import { adminRequest, getToken } from "@/lib/admin";

interface ArchitectResult {
  entryId: string;
  slug: string;
  usedAi: boolean;
  droppedBlocks: string[];
  note?: string;
}

const EXAMPLES = [
  "Yeni bir siber güvenlik izleme ürünü için landing page oluştur",
  "Finans sektörü için PAM çözümleri sayfası — uyumluluk vurgusu ve SSS ile",
  "Create a landing page for a zero-trust network access product",
];

// AI Site Architect: prompt -> blok JSON (Zod kapisindan gecer) -> taslak sayfa.
export default function ArchitectPage(): ReactElement {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [locale, setLocale] = useState("tr");
  const [type, setType] = useState("PAGE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ArchitectResult | null>(null);

  useEffect(() => {
    if (!getToken()) window.location.href = "/admin/login";
  }, []);

  async function generate(): Promise<void> {
    setBusy(true);
    setError("");
    setResult(null);
    const r = await adminRequest<ArchitectResult>("/admin/ai/architect", {
      method: "POST",
      body: JSON.stringify({ prompt, localeCode: locale, type }),
    });
    setBusy(false);
    if (r.ok && r.data) setResult(r.data);
    else setError(r.message ?? "Üretim başarısız.");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-dark">AI Site Mimarı</h1>
      <p className="mb-6 text-sm text-ink-soft">
        İçerik tipini seçip (Sayfa / Blog Yazısı / Ürün) doğal dille tarif edin; uygun bloklarla{" "}
        <strong>taslak</strong> oluşturulur. Üretilen her blok şema doğrulamasından geçer — geçemeyen blok kaydedilmez.
      </p>

      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <div>
          <label htmlFor="ai-prompt" className="mb-1 block text-sm font-medium text-ink-soft">
            Sayfa tarifi
          </label>
          <textarea
            id="ai-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={EXAMPLES[0]}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-1 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="rounded bg-surface-muted px-2 py-1 text-left text-[11px] text-ink-soft hover:text-primary"
              >
                {ex.slice(0, 48)}…
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="ai-type" className="mb-1 block text-sm font-medium text-ink-soft">
              İçerik tipi
            </label>
            <select
              id="ai-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="PAGE">Sayfa</option>
              <option value="POST">Blog Yazısı</option>
              <option value="PRODUCT">Ürün</option>
            </select>
          </div>
          <div>
            <label htmlFor="ai-locale" className="mb-1 block text-sm font-medium text-ink-soft">
              Dil
            </label>
            <select
              id="ai-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy || prompt.trim().length < 10}
            onClick={() => void generate()}
            className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {busy ? "Üretiliyor… (10-30 sn)" : "✨ Sayfa Üret"}
          </button>
        </div>
        {error && <p className="text-sm text-accent">{error}</p>}
      </div>

      {result && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
          <p className="font-medium text-green-800">
            Taslak oluşturuldu: /{result.slug}
            <span className="ml-2 rounded bg-white px-2 py-0.5 text-xs">
              {result.usedAi ? "🤖 Claude ile üretildi" : "📋 Şablon modu (API key yok)"}
            </span>
          </p>
          {result.droppedBlocks.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Şema doğrulamasını geçemeyen bloklar düşürüldü: {result.droppedBlocks.join(", ")}
            </p>
          )}
          {result.note && <p className="mt-1 text-xs text-green-700">{result.note}</p>}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => router.push(`/admin/entries/${result.entryId}`)}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Editörde aç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
