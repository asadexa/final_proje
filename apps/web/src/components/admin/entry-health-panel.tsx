"use client";

import { type ReactElement, useState } from "react";
import { adminFetch } from "@/lib/admin";

interface HealthFinding {
  severity: "error" | "warning" | "info";
  category: string;
  code: string;
  message: string;
  where?: string;
}
interface HealthResult {
  score: number;
  findings: HealthFinding[];
  passed: Array<{ category: string; code: string; label: string }>;
  summary: { error: number; warning: number; info: number; passed: number; total: number };
  categories: Array<{ category: string; label: string; score: number; findings: number; passed: number }>;
}
const HEALTH_CAT_LABEL: Record<string, string> = {
  structure: "YAPI",
  seo: "SEO",
  a11y: "A11Y",
  ux: "UX",
  geo: "GEO",
};

// Kural tabanli Saglik Denetimi paneli (SEO/erisilebilirlik/UX/GEO) — C2'de editorden cikarildi.
// Kendi durumunu (health/busy) yonetir; editordan yalniz entryId + dirty + showToast alir.
export function EntryHealthPanel({
  entryId,
  dirty,
  showToast,
}: {
  entryId: string;
  dirty: boolean;
  showToast: (kind: "ok" | "err", text: string) => void;
}): ReactElement {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);

  // Kural tabanli saglik denetimi (kaydedilmis hal uzerinden calisir)
  async function runHealth(): Promise<void> {
    setHealthBusy(true);
    if (dirty) showToast("err", "Denetim KAYDEDİLMİŞ hali inceler — önce kaydedin.");
    const r = await adminFetch<HealthResult>(`/admin/entries/${entryId}/health`);
    setHealth(r);
    setHealthBusy(false);
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark">Sağlık Denetimi</h3>
        <button
          type="button"
          onClick={() => void runHealth()}
          disabled={healthBusy}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {healthBusy ? "Denetleniyor…" : "Denetle"}
        </button>
      </div>
      {health === null ? (
        <p className="text-xs text-muted">SEO, erişilebilirlik, UX ve GEO kuralları + 0–100 skor.</p>
      ) : (
        <div className="space-y-3">
          {/* skor + ozet */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${health.score >= 85 ? "bg-green-100 text-green-700" : health.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
            >
              {health.score}
            </div>
            <div className="text-[11px] text-muted">
              <div className="font-medium text-ink">
                {health.summary.passed}/{health.summary.total} kontrol geçti
              </div>
              <div>
                {health.summary.error} hata · {health.summary.warning} uyarı · {health.summary.info} bilgi
              </div>
            </div>
          </div>

          {/* kategori kirilimi */}
          {health.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {health.categories.map((c) => (
                <span
                  key={c.category}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.findings === 0 ? "bg-green-50 text-green-700" : c.score >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                  title={`${c.passed} geçti, ${c.findings} bulgu`}
                >
                  {c.label} {c.score}
                </span>
              ))}
            </div>
          )}

          {/* bulgular */}
          {health.findings.length === 0 ? (
            <p className="text-xs font-medium text-green-700">✓ Hiç sorun bulunamadı.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {health.findings.map((f, i) => (
                <li
                  key={f.code + i}
                  className={`rounded px-2 py-1.5 ${f.severity === "error" ? "bg-red-50 text-red-800" : f.severity === "warning" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}
                >
                  <span className="mr-1 text-[9px] font-bold opacity-50">
                    {HEALTH_CAT_LABEL[f.category] ?? f.category}
                  </span>
                  {f.message}
                  {f.where && <span className="block text-[10px] opacity-70">{f.where}</span>}
                </li>
              ))}
            </ul>
          )}

          {/* gecen kontroller (gercek denetim hissi) */}
          {health.passed.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[11px] font-medium text-green-700">
                ✓ Geçen {health.passed.length} kontrol
              </summary>
              <ul className="mt-1 space-y-0.5 pl-1">
                {health.passed.map((p, i) => (
                  <li key={p.code + i} className="text-[11px] text-muted">
                    ✓ {p.label}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
