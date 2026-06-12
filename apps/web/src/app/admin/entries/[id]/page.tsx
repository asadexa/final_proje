"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { BLOCK_FORMS, BlockForm } from "@/components/admin/block-form";
import { BlockPicker } from "@/components/admin/block-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import { VisualEditor, type VisualBlock } from "@/components/admin/visual-editor";
import { adminFetch, adminRequest, getRole, getToken } from "@/lib/admin";
import type { BlockNode, EntryStatus, SeoData } from "@/lib/types";

const BLOCK_TYPES = [
  "HERO",
  "SECTION_HEADING",
  "FEATURE_GRID",
  "PRODUCT_SHOWCASE",
  "VALUE_PROP",
  "STATS",
  "CASE_STUDY",
  "BLOG_CAROUSEL",
  "RICH_TEXT",
  "MEDIA_TEXT",
  "LOGO_CLOUD",
  "CTA_BANNER",
  "CONTACT_FORM",
  "FAQ",
  "PRODUCT_TABS",
  "TESTIMONIAL",
];
const STATUSES: EntryStatus[] = ["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"];
// Onay akisi (lite): EDITOR yayinlayamaz — REVIEW'a gonderir (sunucu da zorlar)
const EDITOR_STATUSES: EntryStatus[] = ["DRAFT", "REVIEW", "ARCHIVED"];

interface TranslationSibling {
  id: string;
  localeCode: string;
  title: string;
  slug: string;
  status: EntryStatus;
}
interface AdminEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featured?: boolean;
  status: EntryStatus;
  publishAt?: string | null;
  localeCode: string;
  groupId?: string;
  group?: { entries: TranslationSibling[] };
  coverImage?: { id: string; url: string } | null;
  blocks: BlockNode[];
  seo?: SeoData | null;
}
const LOCALES = ["tr", "en"];

// datetime-local <-> ISO donusumu YEREL saatte yapilmali; aksi halde UTC'ye
// kayar (orn. TR'de 12:00 secimi 09:00 gorunur). slice(0,16) UTC gosterirdi.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
interface BlockEdit {
  type: string;
  enabled: boolean;
  // Varsayilan: form modu (son-kullanici); JSON modu guc kullanici icin saklanir.
  mode: "form" | "json";
  data: Record<string, unknown>;
  dataText: string;
}
interface Toast {
  kind: "ok" | "err";
  text: string;
}
interface VersionRow {
  version: number;
  note?: string | null;
  createdAt: string;
}
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

export default function EntryEditorPage(): ReactElement {
  const id = (useParams().id as string) ?? "";
  const router = useRouter();
  const [entry, setEntry] = useState<AdminEntry | null>(null);
  const [blocks, setBlocks] = useState<BlockEdit[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);
  // Kaydedilmemis degisiklik takibi (Onizle akisi icin)
  const [dirty, setDirty] = useState(false);
  // Gorsel duzenleme modu (Webflow-lite): canli onizleme + tikla-duzenle
  const [visualMode, setVisualMode] = useState(false);
  // Blok galerisi (form editorunde de ayni secici kullanilir)
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  // Saglik denetimi bulgulari (null = henuz calistirilmadi)
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  // Kapak gorseli secimi: undefined = degismedi, "" = kaldir, id = sec
  const [coverSel, setCoverSel] = useState<string | undefined>(undefined);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // AI Yardımcısı states
  const [aiTab, setAiTab] = useState<"seo" | "editorial" | "translate">("seo");
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ severity: string; message: string; recommendation: string }> | null>(null);
  const [aiSuggestionsBusy, setAiSuggestionsBusy] = useState(false);
  const [aiProposed, setAiProposed] = useState<{ metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string } | null>(null);
  const [aiReadability, setAiReadability] = useState<{ readabilityScore: number; tone: string; suggestions: string[]; metrics?: { words: number; sentences: number; avgSentence: number; paragraphs: number } } | null>(null);
  const [aiReadabilityBusy, setAiReadabilityBusy] = useState(false);
  const [aiTranslating, setAiTranslating] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<number | null>(null);
  const aiProgressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Belirgin geri bildirim: sag-ust toast, 4sn sonra kaybolur
  const showToast = useCallback((kind: Toast["kind"], text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const loadVersions = useCallback(async () => {
    const v = await adminFetch<VersionRow[]>(`/admin/entries/${id}/versions`);
    if (v) setVersions(v);
  }, [id]);

  const load = useCallback(async () => {
    const e = await adminFetch<AdminEntry>(`/admin/entries/${id}`);
    if (e) {
      setEntry(e);
      setCoverSel(undefined);
      setCoverUrl(e.coverImage?.url ?? null);
      setDirty(false);
      setBlocks(
        (e.blocks ?? []).map((b) => ({
          type: b.type,
          enabled: true,
          // Tanimli form varsa form modu, yoksa JSON fallback
          mode: BLOCK_FORMS[b.type] ? "form" : "json",
          data: (b.data ?? {}) as Record<string, unknown>,
          dataText: JSON.stringify(b.data, null, 2),
        })),
      );
    }
    await loadVersions();
  }, [id, loadVersions]);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    void Promise.resolve().then(load);
  }, [load]);

  // Kaydedilmemis degisiklik var mi (SSE handler'inda guncel deger icin ref)
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  // Kendi yazma islemlerimizin tetikledigi SSE olaylarini yutmak icin sayac
  // (her kendi PATCH/restore tam bir olay uretir -> bire bir dusulur)
  const suppressSse = useRef(0);

  // Bu icerik BASKA yerden degisirse (Time Machine restore, baska sekme/kullanici)
  // editor kendini tazeler — "restore ettim ama editor eski hali gosteriyor" sorunu biter.
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    // withCredentials: SSE ucu artik kimlik dogruluyor; httpOnly cookie gonderilir.
    const es = new EventSource(`${api}/api/events/content`, { withCredentials: true });
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data as string) as { entryId?: string; action?: string };
        if (e.entryId !== id) return;
        if (suppressSse.current > 0) {
          suppressSse.current -= 1; // kendi kaydimizin olayi
          return;
        }
        if (dirtyRef.current) {
          showToast("err", "Bu içerik başka bir yerden değişti — kaydetmeden önce sayfayı yenileyin!");
          return;
        }
        void load();
        showToast("ok", e.action === "restore" ? "Sürüm geri yüklendi — içerik tazelendi." : "İçerik başka bir yerden güncellendi — tazelendi.");
      } catch {
        // bozuk event yutulur
      }
    };
    return () => es.close();
  }, [id, load, showToast]);

  // AI ilerleme cubugu zamanlayicisini unmount'ta temizle (sizinti olmasin)
  useEffect(() => {
    return () => {
      if (aiProgressTimer.current) clearInterval(aiProgressTimer.current);
    };
  }, []);

  function patchEntry(p: Partial<AdminEntry>): void {
    setDirty(true);
    setEntry((prev) => (prev ? { ...prev, ...p } : prev));
  }
  function patchSeo(p: Partial<SeoData>): void {
    setDirty(true);
    setEntry((prev) => (prev ? { ...prev, seo: { ...(prev.seo ?? {}), ...p } } : prev));
  }
  function setBlock(i: number, p: Partial<BlockEdit>): void {
    setDirty(true);
    setBlocks((prev) => prev.map((b, j) => (j === i ? { ...b, ...p } : b)));
  }
  function moveBlock(i: number, dir: -1 | 1): void {
    setDirty(true);
    setBlocks((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeBlock(i: number): void {
    setDirty(true);
    setBlocks((prev) => prev.filter((_, j) => j !== i));
  }
  // Gorsel editor <-> blok state koprusu
  function toVisual(): VisualBlock[] {
    return blocks.map((b) => {
      if (b.mode === "form") return { type: b.type, data: b.data };
      try {
        return { type: b.type, data: JSON.parse(b.dataText) as Record<string, unknown> };
      } catch {
        return { type: b.type, data: {} };
      }
    });
  }
  function fromVisual(vbs: VisualBlock[]): void {
    setDirty(true);
    setBlocks(
      vbs.map((vb, i) => ({
        type: vb.type,
        enabled: blocks[i]?.enabled ?? true,
        mode: blocks[i]?.mode ?? (BLOCK_FORMS[vb.type] ? "form" : "json"),
        data: vb.data,
        dataText: JSON.stringify(vb.data, null, 2),
      })),
    );
  }
  // Galeriden preset verisiyle veya bos olarak blok ekler
  function addBlockOfType(type: string, presetData?: Record<string, unknown>): void {
    setDirty(true);
    const data: Record<string, unknown> =
      presetData && Object.keys(presetData).length > 0
        ? presetData
        : type === "RICH_TEXT"
          ? { html: "<p>Yeni içerik</p>" }
          : {};
    setBlocks((prev) => [
      ...prev,
      { type, enabled: true, mode: BLOCK_FORMS[type] ? "form" : "json", data, dataText: JSON.stringify(data, null, 2) },
    ]);
  }

  // Form <-> JSON gecisi: gecerli tarafin verisini digerine tasir
  function toggleMode(i: number): void {
    setBlocks((prev) =>
      prev.map((b, j) => {
        if (j !== i) return b;
        if (b.mode === "form") {
          return { ...b, mode: "json", dataText: JSON.stringify(b.data, null, 2) };
        }
        try {
          return { ...b, mode: "form", data: JSON.parse(b.dataText) as Record<string, unknown> };
        } catch {
          showToast("err", "JSON geçersiz — düzeltin, sonra form moduna geçin.");
          return b;
        }
      }),
    );
  }

  async function save(): Promise<boolean> {
    if (!entry) return false;
    setSaving(true);
    let parsedBlocks;
    try {
      parsedBlocks = blocks.map((b, i) => ({
        type: b.type,
        order: i,
        enabled: b.enabled,
        data: b.mode === "form" ? b.data : (JSON.parse(b.dataText) as unknown),
      }));
    } catch {
      setSaving(false);
      showToast("err", "Bir bloğun JSON verisi geçersiz — kaydedilmedi.");
      return false;
    }
    const body = {
      title: entry.title,
      slug: entry.slug,
      excerpt: entry.excerpt ?? undefined,
      featured: entry.featured ?? false,
      status: entry.status,
      publishAt: entry.publishAt ?? undefined,
      blocks: parsedBlocks,
      seo: {
        metaTitle: entry.seo?.metaTitle ?? undefined,
        metaDescription: entry.seo?.metaDescription ?? undefined,
        canonicalUrl: entry.seo?.canonicalUrl ?? undefined,
        robotsIndex: entry.seo?.robotsIndex ?? true,
        robotsFollow: entry.seo?.robotsFollow ?? true,
        ogTitle: entry.seo?.ogTitle ?? undefined,
        ogDescription: entry.seo?.ogDescription ?? undefined,
      },
      // Kapak gorseli yalnizca degistiyse gonderilir ("" = kaldir)
      ...(coverSel !== undefined ? { coverImageId: coverSel } : {}),
    };
    suppressSse.current += 1; // kendi SSE olayimizi yutmak icin
    const res = await adminRequest<AdminEntry>(`/admin/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      showToast("ok", "Kaydedildi ✓");
      await load();
      return true;
    }
    suppressSse.current = Math.max(0, suppressSse.current - 1); // emit olmadi, sayaci geri al
    showToast("err", `Kaydetme başarısız: ${res.message ?? "bilinmeyen hata"}`);
    return false;
  }

  // Onizleme KAYDEDILMIS hali gosterir; kaydedilmemis degisiklik varsa once kaydetmeyi onerir.
  async function openPreview(): Promise<void> {
    if (dirty) {
      const ok = window.confirm(
        "Kaydedilmemiş değişiklikler var. Önizleme kaydedilmiş hali gösterir.\nÖnce kaydedilsin mi?",
      );
      if (ok) {
        const saved = await save();
        if (!saved) return;
      }
    }
    const r = await adminFetch<{ path: string }>(`/admin/entries/${id}/preview`);
    if (r) window.open(r.path, "_blank");
  }

  // Eksik dildeki cevirisini ayni TranslationGroup'a kopya taslak olarak olusturur.
  async function createTranslation(localeCode: string): Promise<void> {
    if (!entry) return;
    const created = await adminFetch<{ id: string }>("/admin/entries", {
      method: "POST",
      body: JSON.stringify({
        type: entry.type,
        localeCode,
        slug: entry.slug,
        title: `${entry.title} (${localeCode.toUpperCase()})`,
        status: "DRAFT",
        groupId: entry.groupId,
        // Blok yapisi kopyalanir; ceviride metinler duzenlenir
        blocks: blocks.map((b, i) => {
          try {
            return { type: b.type, order: i, data: JSON.parse(b.dataText) as unknown };
          } catch {
            return { type: b.type, order: i, data: {} };
          }
        }),
      }),
    });
    if (created) router.push(`/admin/entries/${created.id}`);
    else showToast("err", "Çeviri oluşturulamadı (slug bu dilde zaten var olabilir).");
  }

  // Kural tabanli saglik denetimi (kaydedilmis hal uzerinden calisir)
  async function runHealth(): Promise<void> {
    setHealthBusy(true);
    if (dirty) showToast("err", "Denetim KAYDEDİLMİŞ hali inceler — önce kaydedin.");
    const r = await adminFetch<HealthResult>(`/admin/entries/${id}/health`);
    setHealth(r);
    setHealthBusy(false);
  }

  async function restore(version: number): Promise<void> {
    if (!window.confirm(`v${version} sürümüne geri dönülsün mü?`)) return;
    suppressSse.current += 1;
    const r = await adminFetch<{ alreadyAtVersion?: boolean }>(
      `/admin/entries/${id}/versions/${version}/restore`,
      { method: "POST" },
    );
    // alreadyAtVersion veya hata: API olay yayinlamaz -> sayaci geri al
    if (!r || r.alreadyAtVersion) suppressSse.current = Math.max(0, suppressSse.current - 1);
    if (r) {
      showToast(
        "ok",
        r.alreadyAtVersion
          ? `İçerik zaten v${version} ile aynı — kopya alınmadı.`
          : `v${version} geri yüklendi ✓`,
      );
      await load();
    }
  }

  // AI cagrisi sirasinda zaman-tahminli ilerleme cubugu. LLM gercek ilerleme
  // (stream progress) vermez; ~9sn sabitiyle %92'ye yumusak yaklasir, yanit
  // gelince %100 -> kisa sure sonra gizlenir. Yani "tahmin", sahte kesinlik degil.
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
        proposed: { metaTitle: string; metaDescription: string; ogTitle: string; ogDescription: string };
      }>(`/admin/ai/entries/${id}/health-suggestions`);
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
        `/admin/ai/entries/${id}/analyze`
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
        const saved = await save();
        if (!saved) return;
      }
    }
    setAiTranslating(localeCode);
    const done = startAiProgress();
    try {
      const res = await adminFetch<{ entryId: string; slug: string }>(
        `/admin/ai/entries/${id}/translate`,
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

  if (!entry) return <p className="text-sm text-muted">Yükleniyor...</p>;

  const inputCls = "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary";

  // Gorsel duzenleme modu tam ekran acilir (kendi arac cubugu + onizleme + panel)
  if (visualMode) {
    return (
      <>
        {toast && (
          <div
            role="status"
            className={`fixed right-6 top-16 z-[60] rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "ok" ? "bg-green-600" : "bg-red-600"}`}
          >
            {toast.text}
          </div>
        )}
        <VisualEditor
          blocks={toVisual()}
          onChange={fromVisual}
          title={entry.title}
          saving={saving}
          dirty={dirty}
          onSave={() => void save()}
          onExit={() => setVisualMode(false)}
          onAddBlock={addBlockOfType}
          onRemoveBlock={removeBlock}
          onMoveBlock={moveBlock}
        />
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Belirgin geri bildirim: sag-ust sabit toast */}
      {toast && (
        <div
          role="status"
          className={`fixed right-6 top-20 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "ok" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.text}
        </div>
      )}
      {/* Ana sutun */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-ink-soft hover:text-primary">
            ← İçerikler
          </Link>
          <span className="text-xs text-muted">
            {entry.type} · {entry.localeCode} · /{entry.slug}
          </span>
        </div>

        <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Başlık</label>
            <input className={inputCls} value={entry.title} onChange={(e) => patchEntry({ title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">Slug</label>
              <input className={inputCls} value={entry.slug} onChange={(e) => patchEntry({ slug: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">Özet</label>
              <input
                className={inputCls}
                value={entry.excerpt ?? ""}
                onChange={(e) => patchEntry({ excerpt: e.target.value })}
              />
            </div>
          </div>
          {entry.type === "POST" && (
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={entry.featured ?? false}
                onChange={(e) => patchEntry({ featured: e.target.checked })}
              />
              Highlights (blog sidebar&apos;ında göster)
            </label>
          )}
          {entry.type === "POST" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">Kapak görseli</label>
              <div className="flex items-start gap-3">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="kapak" className="h-16 w-28 rounded border border-line object-cover" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-line text-xs text-muted">
                    yok
                  </div>
                )}
                <div className="min-w-0 grow">
                  {/* Kutuphaneden sec + bilgisayardan yukle (MediaPicker ikisini de sunar) */}
                  <MediaPicker
                    onPick={(m) => {
                      setDirty(true);
                      setCoverSel(m.id);
                      setCoverUrl(m.url);
                    }}
                    label="Kütüphaneden seç / yükle"
                  />
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirty(true);
                        setCoverSel("");
                        setCoverUrl(null);
                      }}
                      className="ml-4 text-sm text-accent hover:underline"
                    >
                      Kaldır
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bloklar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark">Bloklar ({blocks.length})</h2>
            <button
              type="button"
              onClick={() => setBlockPickerOpen(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Blok ekle (galeriden seç)
            </button>
          </div>
          {blockPickerOpen && (
            <BlockPicker
              onClose={() => setBlockPickerOpen(false)}
              onPick={(type, data) => {
                addBlockOfType(type, data);
                setBlockPickerOpen(false);
              }}
            />
          )}
          {blocks.map((b, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-muted">#{i + 1}</span>
                <select
                  className="rounded border border-line px-2 py-1 text-sm"
                  value={b.type}
                  onChange={(e) => setBlock(i, { type: e.target.value })}
                >
                  {BLOCK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex items-center gap-3 text-sm">
                  {BLOCK_FORMS[b.type] && (
                    <button
                      type="button"
                      onClick={() => toggleMode(i)}
                      className="rounded border border-line px-2 py-0.5 text-xs text-ink-soft hover:border-primary hover:text-primary"
                      title="Form ve JSON görünümü arasında geçiş"
                    >
                      {b.mode === "form" ? "JSON" : "Form"}
                    </button>
                  )}
                  <button type="button" onClick={() => moveBlock(i, -1)} className="text-ink-soft hover:text-primary">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveBlock(i, 1)} className="text-ink-soft hover:text-primary">
                    ↓
                  </button>
                  <button type="button" onClick={() => removeBlock(i)} className="text-accent hover:underline">
                    Sil
                  </button>
                </div>
              </div>
              {b.mode === "form" && BLOCK_FORMS[b.type] ? (
                <BlockForm type={b.type} data={b.data} onChange={(data) => setBlock(i, { data })} />
              ) : (
                <textarea
                  className="h-32 w-full rounded border border-line p-2 font-mono text-xs outline-none focus:border-primary"
                  value={b.dataText}
                  onChange={(e) => setBlock(i, { dataText: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        {/* SEO */}
        <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-dark">SEO</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Meta Title</label>
            <input
              className={inputCls}
              value={entry.seo?.metaTitle ?? ""}
              onChange={(e) => patchSeo({ metaTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Meta Description</label>
            <textarea
              className={inputCls}
              rows={2}
              value={entry.seo?.metaDescription ?? ""}
              onChange={(e) => patchSeo({ metaDescription: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">
              Canonical URL <span className="font-normal text-muted">(boş = otomatik)</span>
            </label>
            <input
              className={inputCls}
              placeholder="https://..."
              value={entry.seo?.canonicalUrl ?? ""}
              onChange={(e) => patchSeo({ canonicalUrl: e.target.value || null })}
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={entry.seo?.robotsIndex ?? true}
                onChange={(e) => patchSeo({ robotsIndex: e.target.checked })}
              />
              Index
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={entry.seo?.robotsFollow ?? true}
                onChange={(e) => patchSeo({ robotsFollow: e.target.checked })}
              />
              Follow
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">OG Title</label>
            <input
              className={inputCls}
              value={entry.seo?.ogTitle ?? ""}
              onChange={(e) => patchSeo({ ogTitle: e.target.value || null })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">OG Description</label>
            <textarea
              className={inputCls}
              rows={2}
              value={entry.seo?.ogDescription ?? ""}
              onChange={(e) => patchSeo({ ogDescription: e.target.value || null })}
            />
          </div>
        </div>
      </div>

      {/* Yan panel: yayin + onizleme + versiyonlar */}
      <aside className="space-y-4">
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Durum</label>
            <select
              className={inputCls}
              value={entry.status}
              onChange={(e) => patchEntry({ status: e.target.value as EntryStatus })}
            >
              {(getRole() === "ADMIN" ? STATUSES : EDITOR_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {s === "REVIEW" ? "REVIEW (onay bekliyor)" : s}
                </option>
              ))}
              {/* mevcut durum listede yoksa da gorunsun (orn. EDITOR, PUBLISHED icerige bakarken) */}
              {getRole() !== "ADMIN" && !EDITOR_STATUSES.includes(entry.status) && (
                <option value={entry.status} disabled>
                  {entry.status}
                </option>
              )}
            </select>
            {getRole() !== "ADMIN" && (
              <p className="mt-1 text-[11px] text-muted">
                Yayınlama ADMIN onayı gerektirir — REVIEW ile onaya gönderin.
              </p>
            )}
            {getRole() === "ADMIN" && entry.status === "REVIEW" && (
              <button
                type="button"
                onClick={() => {
                  patchEntry({ status: "PUBLISHED" });
                  showToast("ok", "Durum PUBLISHED yapıldı — Kaydet ile onayla.");
                }}
                className="mt-2 w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                ✓ Onayla ve Yayınla
              </button>
            )}
          </div>
          {entry.status === "SCHEDULED" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">Yayın zamanı</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={entry.publishAt ? isoToLocalInput(entry.publishAt) : ""}
                onChange={(e) => patchEntry({ publishAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={() => setVisualMode(true)}
            className="w-full rounded bg-dark px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            🎨 Görsel Düzenle
          </button>
          <button
            type="button"
            onClick={() => void openPreview()}
            className="w-full rounded border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary"
          >
            Önizle
          </button>
          {dirty && (
            <p className="text-center text-xs text-amber-600">Kaydedilmemiş değişiklikler var</p>
          )}
        </div>

        {/* Kural tabanli Saglik Denetimi (SEO/erisilebilirlik/UX/GEO) */}
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

        {/* AI Asistanı */}
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
                      patchSeo({
                        metaTitle: aiProposed.metaTitle,
                        metaDescription: aiProposed.metaDescription,
                        ogTitle: aiProposed.ogTitle,
                        ogDescription: aiProposed.ogDescription,
                      });
                      showToast("ok", "Önerilen meta alanları forma uygulandı — kaydetmeyi unutmayın.");
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
                {LOCALES.filter(
                  (lc) => !(entry.group?.entries ?? []).some((s) => s.localeCode === lc),
                ).map((lc) => (
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
                {LOCALES.filter(
                  (lc) => !(entry.group?.entries ?? []).some((s) => s.localeCode === lc),
                ).length === 0 && (
                  <p className="text-[11px] font-medium text-green-700">✓ Tüm dil alternatifleri zaten mevcut.</p>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Ceviri eslestirme: ayni TranslationGroup'taki kardesler + eksik dil olusturma */}
        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-dark">Çeviriler</h3>
          <ul className="space-y-2 text-sm">
            {(entry.group?.entries ?? [])
              .filter((s) => s.id !== entry.id)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <Link href={`/admin/entries/${s.id}`} className="text-primary hover:underline">
                    {s.localeCode.toUpperCase()} · {s.title.slice(0, 24)}
                  </Link>
                  <span className="text-xs text-muted">{s.status}</span>
                </li>
              ))}
            {LOCALES.filter(
              (lc) => !(entry.group?.entries ?? []).some((s) => s.localeCode === lc),
            ).map((lc) => (
              <li key={lc}>
                <button
                  type="button"
                  onClick={() => void createTranslation(lc)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + {lc.toUpperCase()} çevirisi oluştur (kopya taslak)
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark">Sürümler ({versions.length})</h3>
            <Link href={`/admin/entries/${id}/history`} className="text-xs font-medium text-primary hover:underline">
              Zaman Tüneli →
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {versions.map((v) => (
              <li key={v.version} className="flex items-center justify-between">
                <span className="text-ink-soft">
                  v{v.version}
                  {v.note ? ` · ${v.note}` : ""}
                </span>
                <button type="button" onClick={() => restore(v.version)} className="text-xs text-primary hover:underline">
                  Geri yükle
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
