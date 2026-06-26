"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin";

type AiMeta = { metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string };

// AI Asistani paneli (SEO onerileri / okunurluk / ceviri) — C2'de editorden cikarildi (davranis
// birebir ayni). Kendi durumunu (ai* state + zaman-tahminli ilerleme cubugu) yonetir; editordan
// entryId, dirty, eksik diller, meta-uygula callback'i, ceviri-oncesi-kaydet callback'i, showToast alir.
export function EntryAiAssistant({
  entryId,
  dirty,
  missingLocales,
  onApplyMeta,
  onSaveBeforeTranslate,
  showToast,
}: {
  entryId: string;
  dirty: boolean;
  missingLocales: string[];
  onApplyMeta: (meta: AiMeta) => void;
  onSaveBeforeTranslate: () => Promise<boolean>;
  showToast: (kind: "ok" | "err", text: string) => void;
}): ReactElement {
  const router = useRouter();
  const [aiTab, setAiTab] = useState<"seo" | "editorial" | "translate">("seo");
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ severity: string; message: string; recommendation: string }> | null>(null);
  const [aiSuggestionsBusy, setAiSuggestionsBusy] = useState(false);
  const [aiProposed, setAiProposed] = useState<AiMeta | null>(null);
  const [aiReadability, setAiReadability] = useState<{ readabilityScore: number; tone: string; suggestions: string[]; metrics?: { words: number; sentences: number; avgSentence: number; paragraphs: number } } | null>(null);
  const [aiReadabilityBusy, setAiReadabilityBusy] = useState(false);
  const [aiTranslating, setAiTranslating] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<number | null>(null);
  const aiProgressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI ilerleme cubugu zamanlayicisini unmount'ta temizle (sizinti olmasin)
  useEffect(() => {
    return () => {
      if (aiProgressTimer.current) clearInterval(aiProgressTimer.current);
    };
  }, []);

  // AI cagrisi sirasinda zaman-tahminli ilerleme cubugu. LLM gercek ilerleme (stream progress)
  // vermez; ~9sn sabitiyle %92'ye yumusak yaklasir, yanit gelince %100 -> kisa sure sonra gizlenir.
  function startAiProgress(): () => void {
    let tick = 0;
    setAiProgress(6);
    if (aiProgressTimer.current) clearInterval(aiProgressTimer.current);
    aiProgressTimer.current = setInterval(() => {
      tick += 1;
      const t = tick * 0.2; // saniye
      setAiProgress(Math.min(92, Math.round(92 * (1 - Math.exp(-t / 9)))));
    }, 200);
    return () => {
      if (aiProgressTimer.current) {
        clearInterval(aiProgressTimer.current);
        aiProgressTimer.current = null;
      }
      setAiProgress(100);
      window.setTimeout(() => setAiProgress(null), 600);
    };
  }

  // AI SEO suggestions
  async function runAiSeo(): Promise<void> {
    if (dirty) {
      showToast("err", "AI Analizi kaydedilmiş hal üzerinde çalışır — önce kaydedin.");
      return;
    }
    setAiSuggestionsBusy(true);
    const done = startAiProgress();
    try {
      const res = await adminFetch<{
        suggestions: Array<{ severity: string; message: string; recommendation: string }>;
        proposed: AiMeta;
      }>(`/admin/ai/entries/${entryId}/health-suggestions`);
      setAiSuggestions(res?.suggestions ?? []);
      setAiProposed(res?.proposed ?? null);
    } finally {
      done();
      setAiSuggestionsBusy(false);
    }
  }

  // AI Content / Editorial Analysis
  async function runAiEditorial(): Promise<void> {
    if (dirty) {
      showToast("err", "AI Analizi kaydedilmiş hal üzerinde çalışır — önce kaydedin.");
      return;
    }
    setAiReadabilityBusy(true);
    const done = startAiProgress();
    try {
      const res = await adminFetch<{ readabilityScore: number; tone: string; suggestions: string[]; metrics?: { words: number; sentences: number; avgSentence: number; paragraphs: number } }>(
        `/admin/ai/entries/${entryId}/analyze`
      );
      setAiReadability(res ?? null);
    } finally {
      done();
      setAiReadabilityBusy(false);
    }
  }

  // AI Translation Assistant
  async function runAiTranslate(localeCode: string): Promise<void> {
    if (dirty) {
      const ok = window.confirm(
        "Kaydedilmemiş değişiklikler var. AI çevirisi kaydedilmiş en son hali kullanır.\nÖnce kaydedilsin mi?",
      );
      if (ok) {
        const saved = await onSaveBeforeTranslate();
        if (!saved) return;
      }
    }
    setAiTranslating(localeCode);
    const done = startAiProgress();
    try {
      const res = await adminFetch<{ entryId: string; slug: string }>(
        `/admin/ai/entries/${entryId}/translate`,
        {
          method: "POST",
          body: JSON.stringify({ targetLocale: localeCode }),
        }
      );
      if (res && res.entryId) {
        showToast("ok", "AI çeviri taslağı başarıyla oluşturuldu.");
        router.push(`/admin/entries/${res.entryId}`);
      } else {
        showToast("err", "AI çeviri taslağı oluşturulamadı.");
      }
    } catch {
      showToast("err", "AI çeviri hatası.");
    } finally {
      done();
      setAiTranslating(null);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
        <h3 className="text-sm font-semibold text-dark flex items-center gap-1.5">
          <span>🤖</span> AI Asistanı
        </h3>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Claude Opus 4.8
        </span>
      </div>

      {/* Tab Seçimi */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded bg-line/20 p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => setAiTab("seo")}
          className={`rounded py-1 text-center font-medium ${aiTab === "seo" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          SEO
        </button>
        <button
          type="button"
          onClick={() => setAiTab("editorial")}
          className={`rounded py-1 text-center font-medium ${aiTab === "editorial" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          Okunurluk
        </button>
        <button
          type="button"
          onClick={() => setAiTab("translate")}
          className={`rounded py-1 text-center font-medium ${aiTab === "translate" ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          Çeviri
        </button>
      </div>

      {aiProgress !== null && (
        <div className="mb-3 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/30">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
              style={{ width: `${aiProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted">
            <span className="animate-pulse">Claude analiz ediyor…</span>
            <span className="font-medium tabular-nums text-primary">%{aiProgress}</span>
          </div>
        </div>
      )}

      {/* Tab İçerikleri */}
      {aiTab === "seo" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void runAiSeo()}
            disabled={aiSuggestionsBusy}
            className="w-full rounded bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
          >
            {aiSuggestionsBusy ? "Öneriler Alınıyor..." : "AI SEO Önerileri Al"}
          </button>
          {aiSuggestions === null ? (
            <p className="text-[11px] text-muted">SEO optimizasyonu için qualitative öneriler üretin.</p>
          ) : aiSuggestions.length === 0 ? (
            <p className="text-[11px] font-medium text-green-700">✓ AI ek bir SEO sorunu tespit etmedi.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {aiSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  className={`rounded p-2 text-xs border ${s.severity === "error" ? "bg-red-50/50 border-red-100 text-red-900" : s.severity === "warning" ? "bg-amber-50/50 border-amber-100 text-amber-900" : "bg-blue-50/50 border-blue-100 text-blue-900"}`}
                >
                  <div className="font-semibold">{s.message}</div>
                  <div className="mt-1 text-[10px] opacity-85">💡 {s.recommendation}</div>
                </li>
              ))}
            </ul>
          )}

          {aiProposed && (
            <div className="rounded border border-primary/30 bg-primary/5 p-2.5 space-y-2">
              <div className="text-[11px] font-semibold text-primary">✨ Önerilen meta alanları</div>
              <div className="space-y-1.5 text-[11px]">
                <div>
                  <div className="text-muted">Meta Title <span className="opacity-60">({aiProposed.metaTitle.length} kr)</span></div>
                  <div className="font-medium text-ink">{aiProposed.metaTitle}</div>
                </div>
                <div>
                  <div className="text-muted">Meta Description <span className="opacity-60">({aiProposed.metaDescription.length} kr)</span></div>
                  <div className="text-ink">{aiProposed.metaDescription}</div>
                </div>
                {aiProposed.ogTitle && (
                  <div>
                    <div className="text-muted">OG Title</div>
                    <div className="text-ink">{aiProposed.ogTitle}</div>
                  </div>
                )}
                {aiProposed.ogDescription && (
                  <div>
                    <div className="text-muted">OG Description</div>
                    <div className="text-ink">{aiProposed.ogDescription}</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onApplyMeta({
                    metaTitle: aiProposed.metaTitle,
                    metaDescription: aiProposed.metaDescription,
                    ogTitle: aiProposed.ogTitle,
                    ogDescription: aiProposed.ogDescription,
                  });
                }}
                className="w-full rounded bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Forma Uygula
              </button>
            </div>
          )}
        </div>
      )}

      {aiTab === "editorial" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void runAiEditorial()}
            disabled={aiReadabilityBusy}
            className="w-full rounded bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
          >
            {aiReadabilityBusy ? "Analiz Ediliyor..." : "Editoryal Analiz Çalıştır"}
          </button>
          {aiReadability === null ? (
            <p className="text-[11px] text-muted">Okunabilirlik skoru ve içerik tonunu analiz edin.</p>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-line/10 p-2 rounded">
                <span className="text-muted">Okunurluk Skoru:</span>
                <span className={`font-bold ${aiReadability.readabilityScore >= 80 ? "text-green-600" : aiReadability.readabilityScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                  {aiReadability.readabilityScore} / 100
                </span>
              </div>
              <div className="flex justify-between items-center bg-line/10 p-2 rounded">
                <span className="text-muted">İçerik Tonu:</span>
                <span className="font-bold text-ink">{aiReadability.tone}</span>
              </div>
              {aiReadability.metrics && (
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="rounded bg-line/10 p-1.5">
                    <div className="font-bold text-ink">{aiReadability.metrics.words}</div>
                    <div className="text-[9px] text-muted">kelime</div>
                  </div>
                  <div className="rounded bg-line/10 p-1.5">
                    <div className="font-bold text-ink">{aiReadability.metrics.sentences}</div>
                    <div className="text-[9px] text-muted">cümle</div>
                  </div>
                  <div className="rounded bg-line/10 p-1.5">
                    <div className="font-bold text-ink">{aiReadability.metrics.avgSentence}</div>
                    <div className="text-[9px] text-muted">ort. kel/cümle</div>
                  </div>
                </div>
              )}
              {aiReadability.suggestions.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold text-ink-soft mb-1">Öneriler:</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-muted pl-1">
                    {aiReadability.suggestions.map((sug, idx) => (
                      <li key={idx} className="leading-snug">{sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {aiTab === "translate" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted leading-relaxed">
            Eksik dil alternatifini sayfa yapısını bozmadan AI ile çevirerek oluşturun.
          </p>
          <ul className="space-y-1.5">
            {missingLocales.map((lc) => (
              <li key={lc}>
                <button
                  type="button"
                  disabled={aiTranslating !== null}
                  onClick={() => void runAiTranslate(lc)}
                  className="w-full text-left rounded border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary transition-all disabled:opacity-50 flex items-center justify-between"
                >
                  <span>{lc.toUpperCase()} diline AI ile Çevir</span>
                  {aiTranslating === lc ? (
                    <span className="text-[10px] text-muted animate-pulse">Çevriliyor...</span>
                  ) : (
                    <span>✨</span>
                  )}
                </button>
              </li>
            ))}
            {missingLocales.length === 0 && (
              <p className="text-[11px] font-medium text-green-700">✓ Tüm dil alternatifleri zaten mevcut.</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
