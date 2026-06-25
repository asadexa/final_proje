"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { adminRequest } from "@/lib/admin";
import { useAdminGuard } from "@/lib/use-admin-guard";

interface ArchitectResult {
  entryId: string;
  slug: string;
  usedAi: boolean;
  droppedBlocks: string[];
  note?: string;
  blocks: string[]; // uretilen blok tipleri (manifest)
  title: string;
  rationale: string;
}

const EXAMPLES = [
  "Yeni bir siber güvenlik izleme ürünü için landing page oluştur",
  "Finans sektörü için PAM çözümleri sayfası — uyumluluk vurgusu ve SSS ile",
  "Create a landing page for a zero-trust network access product",
];

// Blok tipi -> Turkce etiket (sonuc kartindaki manifest icin)
const BLOCK_LABEL: Record<string, string> = {
  HERO: "Hero",
  SECTION_HEADING: "Başlık",
  FEATURE_GRID: "Özellikler",
  PRODUCT_SHOWCASE: "Ürün Vitrini",
  VALUE_PROP: "Değer Önermesi",
  STATS: "İstatistikler",
  CASE_STUDY: "Vaka Çalışması",
  BLOG_CAROUSEL: "Blog Karuseli",
  RICH_TEXT: "Zengin Metin",
  MEDIA_TEXT: "Medya + Metin",
  LOGO_CLOUD: "Logo Bulutu",
  CTA_BANNER: "CTA",
  CONTACT_FORM: "İletişim Formu",
  FAQ: "SSS",
  PRODUCT_TABS: "Ürün Sekmeleri",
  TESTIMONIAL: "Referans",
  RESOURCE_HUB: "Kaynaklar",
};
const MIN_PROMPT = 10;
const MAX_PROMPT = 2000;

// AI Site Architect: prompt -> blok JSON (Zod kapisindan gecer) -> taslak sayfa.
export default function ArchitectPage(): ReactElement {
  const router = useRouter();
  useAdminGuard();
  const [prompt, setPrompt] = useState("");
  const [locale, setLocale] = useState("tr");
  const [type, setType] = useState("PAGE");
  const [style, setStyle] = useState<"landing" | "content">("landing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ArchitectResult | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Zaman-tahminli ilerleme (LLM stream progress vermez). done(success): basari ->
  // %100 + fade; HATA -> %100'e KOSMADAN aninda gizle (yaniltici "tamamlandi" sinyali olmasin).
  function startProgress(): (success: boolean) => void {
    let tick = 0;
    setProgress(5);
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      tick += 1;
      const t = tick * 0.4;
      setProgress(Math.min(92, Math.round(92 * (1 - Math.exp(-t / 14)))));
    }, 400);
    return (success: boolean) => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      if (success) {
        setProgress(100);
        window.setTimeout(() => setProgress(null), 600);
      } else {
        setProgress(null);
      }
    };
  }

  useEffect(
    () => () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    },
    [],
  );

  // Sonuc gelince karta yumusak kaydir + odak (reveal kacirilmasin, ekran okuyucu duysun)
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      resultRef.current.focus();
    }
  }, [result]);

  async function generate(): Promise<void> {
    setBusy(true);
    setError("");
    setResult(null);
    const finish = startProgress();
    const r = await adminRequest<ArchitectResult>("/admin/ai/architect", {
      method: "POST",
      body: JSON.stringify({ prompt, localeCode: locale, type, style }),
    });
    const ok = r.ok && !!r.data;
    finish(ok);
    setBusy(false);
    if (ok && r.data) setResult(r.data);
    else setError(r.message ?? "Üretim başarısız.");
  }

  function reset(): void {
    setResult(null);
    setError("");
    setPrompt("");
    document.getElementById("ai-prompt")?.focus();
  }

  const len = prompt.trim().length;
  const tooShort = len > 0 && len < MIN_PROMPT;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-dark">AI Site Mimarı</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Doğal dille tarif edin; AI <strong>bitmiş içerik değil</strong>, düzenlemeye hazır bir taslak
        iskelet üretir (üretilen her blok şema doğrulamasından geçer).
      </p>

      <div aria-busy={busy} className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <div>
          <label htmlFor="ai-prompt" className="mb-1 block text-sm font-medium text-ink-soft">
            Sayfa tarifi
          </label>
          <textarea
            id="ai-prompt"
            rows={4}
            value={prompt}
            disabled={busy}
            maxLength={MAX_PROMPT}
            aria-describedby="ai-prompt-req"
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ne tür bir sayfa, kime hitap ediyor, hangi bölümler olsun? (örn. özellikler, fiyatlandırma, SSS)"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
          <p id="ai-prompt-req" className="sr-only">
            En az {MIN_PROMPT}, en fazla {MAX_PROMPT} karakter.
          </p>
          {tooShort && (
            <p className="mt-1 text-[11px] text-muted">
              Üretmek için en az {MIN_PROMPT} karakter ({len}/{MIN_PROMPT})
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted">Örneklerden başla:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={busy}
                title={ex}
                aria-label={`Örneği kullan: ${ex}`}
                onClick={() => setPrompt(ex)}
                className="max-w-[230px] truncate rounded border border-line bg-surface-muted px-2 py-1 text-left text-[11px] text-ink-soft transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
              >
                {ex}
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
              disabled={busy}
              onChange={(e) => setType(e.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="PAGE">Sayfa</option>
              <option value="POST">Blog Yazısı</option>
              <option value="PRODUCT">Ürün</option>
            </select>
          </div>
          {type === "PAGE" && (
            <div>
              <label htmlFor="ai-style" className="mb-1 block text-sm font-medium text-ink-soft">
                Sayfa stili
              </label>
              <select
                id="ai-style"
                value={style}
                disabled={busy}
                onChange={(e) => setStyle(e.target.value as "landing" | "content")}
                className="rounded border border-line bg-surface px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="landing">Landing (pazarlama)</option>
                <option value="content">İçerik sayfası</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="ai-locale" className="mb-1 block text-sm font-medium text-ink-soft">
              Dil
            </label>
            <select
              id="ai-locale"
              value={locale}
              disabled={busy}
              onChange={(e) => setLocale(e.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy || len < MIN_PROMPT}
            title={len < MIN_PROMPT ? `En az ${MIN_PROMPT} karakter yazın` : "Sayfa üret"}
            onClick={() => void generate()}
            className="rounded bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Üretiliyor… (10-30 sn)" : "✨ Sayfa Üret"}
          </button>
        </div>
        {progress !== null && (
          <div className="space-y-1" role="status" aria-live="polite">
            <div
              role="progressbar"
              aria-label="Üretim ilerlemesi"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`Üretiliyor, %${progress}`}
              className="h-2 w-full overflow-hidden rounded-full bg-line/30"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-ink-soft">
              <span className="animate-pulse">Claude içeriği oluşturuyor…</span>
              <span className="font-medium tabular-nums text-primary-600">%{progress}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hata: basari kartiyla SIMETRIK, form ALTINDA, role=alert ile duyurulur */}
      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-4 text-accent"
        >
          <span aria-hidden>⚠</span>
          <div>
            <p className="text-sm font-medium">Üretim başarısız</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5 outline-none"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-green-800">Taslak oluşturuldu: {result.title}</p>
            {result.usedAi ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Claude ile üretildi
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Şablon modu (API key yok)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-green-700">/{result.slug}</p>

          {/* Manifest: ne uretildi (editore girmeden gorunsun) */}
          {result.blocks.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-green-700">
                {result.blocks.length} blok oluşturuldu
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {result.blocks.map((b, i) => (
                  <span
                    key={`${b}-${i}`}
                    className="rounded bg-white px-2 py-0.5 text-xs text-green-800 shadow-sm"
                  >
                    {BLOCK_LABEL[b] ?? b}
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.rationale && <p className="mt-2 text-xs text-green-700">{result.rationale}</p>}

          {result.droppedBlocks.length > 0 && (
            <p className="mt-2 text-xs text-accent">
              Şema doğrulamasını geçemeyen bloklar düşürüldü: {result.droppedBlocks.join(", ")}
            </p>
          )}
          {result.note && <p className="mt-1 text-xs text-amber-800">{result.note}</p>}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(`/admin/entries/${result.entryId}`)}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Taslağı editörde düzenle
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary"
            >
              Yeni tarif
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
