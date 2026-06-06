"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";
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
];
const STATUSES: EntryStatus[] = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"];

interface AdminEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  status: EntryStatus;
  publishAt?: string | null;
  localeCode: string;
  blocks: BlockNode[];
  seo?: SeoData | null;
}
interface BlockEdit {
  type: string;
  enabled: boolean;
  dataText: string;
}
interface VersionRow {
  version: number;
  note?: string | null;
  createdAt: string;
}

export default function EntryEditorPage(): ReactElement {
  const id = (useParams().id as string) ?? "";
  const [entry, setEntry] = useState<AdminEntry | null>(null);
  const [blocks, setBlocks] = useState<BlockEdit[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const loadVersions = useCallback(async () => {
    const v = await adminFetch<VersionRow[]>(`/admin/entries/${id}/versions`);
    if (v) setVersions(v);
  }, [id]);

  const load = useCallback(async () => {
    const e = await adminFetch<AdminEntry>(`/admin/entries/${id}`);
    if (e) {
      setEntry(e);
      setBlocks(
        (e.blocks ?? []).map((b) => ({
          type: b.type,
          enabled: true,
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
    void load();
  }, [load]);

  function patchEntry(p: Partial<AdminEntry>): void {
    setEntry((prev) => (prev ? { ...prev, ...p } : prev));
  }
  function patchSeo(p: Partial<SeoData>): void {
    setEntry((prev) => (prev ? { ...prev, seo: { ...(prev.seo ?? {}), ...p } } : prev));
  }
  function setBlock(i: number, p: Partial<BlockEdit>): void {
    setBlocks((prev) => prev.map((b, j) => (j === i ? { ...b, ...p } : b)));
  }
  function moveBlock(i: number, dir: -1 | 1): void {
    setBlocks((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeBlock(i: number): void {
    setBlocks((prev) => prev.filter((_, j) => j !== i));
  }
  function addBlock(): void {
    setBlocks((prev) => [...prev, { type: "RICH_TEXT", enabled: true, dataText: "{\n  \"html\": \"<p></p>\"\n}" }]);
  }

  async function save(): Promise<void> {
    if (!entry) return;
    setSaving(true);
    setMsg("");
    let parsedBlocks;
    try {
      parsedBlocks = blocks.map((b, i) => ({
        type: b.type,
        order: i,
        enabled: b.enabled,
        data: JSON.parse(b.dataText) as unknown,
      }));
    } catch {
      setSaving(false);
      setMsg("Hata: bir bloğun JSON verisi geçersiz.");
      return;
    }
    const body = {
      title: entry.title,
      slug: entry.slug,
      excerpt: entry.excerpt ?? undefined,
      status: entry.status,
      publishAt: entry.publishAt ?? undefined,
      blocks: parsedBlocks,
      seo: {
        metaTitle: entry.seo?.metaTitle ?? undefined,
        metaDescription: entry.seo?.metaDescription ?? undefined,
      },
    };
    const res = await adminFetch<AdminEntry>(`/admin/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res) {
      setMsg("Kaydedildi ✓");
      await load();
    } else {
      setMsg("Kaydetme başarısız (validasyon hatası olabilir).");
    }
  }

  async function openPreview(): Promise<void> {
    const r = await adminFetch<{ path: string }>(`/admin/entries/${id}/preview`);
    if (r) window.open(r.path, "_blank");
  }

  async function restore(version: number): Promise<void> {
    if (!window.confirm(`v${version} sürümüne geri dönülsün mü?`)) return;
    const r = await adminFetch(`/admin/entries/${id}/versions/${version}/restore`, { method: "POST" });
    if (r) {
      setMsg(`v${version} geri yüklendi ✓`);
      await load();
    }
  }

  if (!entry) return <p className="text-sm text-muted">Yükleniyor...</p>;

  const inputCls = "w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
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
        </div>

        {/* Bloklar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dark">Bloklar ({blocks.length})</h2>
            <button type="button" onClick={addBlock} className="text-sm font-medium text-primary hover:underline">
              + Blok ekle
            </button>
          </div>
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
                <div className="ml-auto flex gap-2 text-sm">
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
              <textarea
                className="h-32 w-full rounded border border-line p-2 font-mono text-xs outline-none focus:border-primary"
                value={b.dataText}
                onChange={(e) => setBlock(i, { dataText: e.target.value })}
              />
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {entry.status === "SCHEDULED" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">Yayın zamanı</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={entry.publishAt ? entry.publishAt.slice(0, 16) : ""}
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
            onClick={openPreview}
            className="w-full rounded border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary"
          >
            Önizle
          </button>
          {msg && <p className="text-center text-sm text-ink-soft">{msg}</p>}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-dark">Sürümler ({versions.length})</h3>
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
