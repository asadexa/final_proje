"use client";

import Link from "next/link";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { LoadError } from "@/components/admin/load-error";
import { adminFetch, adminRequest } from "@/lib/admin";
import { absoluteDateTime, relativeTime } from "@/lib/datetime";
import { useAdminGuard } from "@/lib/use-admin-guard";
import type { EntryList, EntryStatus } from "@/lib/types";

// Durum rozeti renkleri + Turkce etiketleri (graph TYPE_COLOR ile ayni tip paleti).
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  REVIEW: "bg-purple-100 text-purple-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Yayında",
  DRAFT: "Taslak",
  REVIEW: "İncelemede",
  SCHEDULED: "Zamanlanmış",
  ARCHIVED: "Arşiv",
};
const STATUS_ORDER: EntryStatus[] = ["PUBLISHED", "DRAFT", "REVIEW", "SCHEDULED", "ARCHIVED"];
const TYPE_COLOR: Record<string, string> = { PAGE: "#1563ff", PRODUCT: "#03c065", POST: "#f59e0b" };

type SortKey = "title" | "updatedAt";

const fieldCls =
  "rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const PAGE_SIZE = 20;

export default function AdminEntriesPage(): ReactElement {
  const ready = useAdminGuard();
  const [list, setList] = useState<EntryList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [localeFilter, setLocaleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EntryStatus>("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Client-side filtre/sirala/sayfalama: tum kayitlari bir kerede cek (tavan 500).
    // API status/sirala/arama parametresi desteklemiyor; tavan asilirsa server-side'a gecilmeli (TODO).
    const r = await adminRequest<EntryList>("/admin/entries?pageSize=500");
    if (r.ok) setList(r.data ?? null);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    if (ready) void Promise.resolve().then(load);
  }, [ready, load]);

  const items = useMemo(() => list?.items ?? [], [list]);
  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type))).sort(), [items]);
  const locales = useMemo(
    () => Array.from(new Set(items.map((i) => i.localeCode).filter((l): l is string => !!l))).sort(),
    [items],
  );
  const q = query.trim().toLowerCase();

  // Durum disindaki filtreler (tip + dil + arama). Sekme adetleri bu kumeye gore hesaplanir.
  const preStatus = useMemo(
    () =>
      items.filter(
        (it) =>
          (typeFilter === "" || it.type === typeFilter) &&
          (localeFilter === "" || it.localeCode === localeFilter) &&
          (q === "" || it.title.toLowerCase().includes(q) || it.slug.toLowerCase().includes(q)),
      ),
    [items, typeFilter, localeFilter, q],
  );
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of preStatus) {
      const s = it.status ?? "DRAFT";
      m[s] = (m[s] ?? 0) + 1;
    }
    return m;
  }, [preStatus]);

  const filtered = useMemo(
    () => preStatus.filter((it) => statusFilter === "" || (it.status ?? "DRAFT") === statusFilter),
    [preStatus, statusFilter],
  );
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp =
        sortKey === "title"
          ? a.title.localeCompare(b.title, "tr")
          : (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  if (loading) return <p className="text-sm text-muted">Yükleniyor...</p>;
  if (error)
    return <LoadError onRetry={() => void load()} label="İçerikler yüklenemedi — sunucuya ulaşılamadı." />;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
  const capped = list ? list.total > items.length : false;

  // Filtre/sirala degisince ilk sayfaya don.
  const resetPage = (): void => setPage(1);
  function toggleSort(key: SortKey): void {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "updatedAt" ? "desc" : "asc");
    }
    resetPage();
  }
  function clearFilters(): void {
    setQuery("");
    setTypeFilter("");
    setLocaleFilter("");
    setStatusFilter("");
    resetPage();
  }
  // Onizleme statik slug ile acilmaz: API imzali token'li yol uretir (editor ile ayni mekanizma).
  async function openPreview(entryId: string): Promise<void> {
    const r = await adminFetch<{ path: string }>(`/admin/entries/${entryId}/preview`);
    if (r) window.open(r.path, "_blank", "noopener");
  }
  const sortAria = (k: SortKey): "ascending" | "descending" | "none" =>
    sortKey === k ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  const sortGlyph = (k: SortKey): string => (sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "");

  const tabs: { key: "" | EntryStatus; label: string; count: number }[] = [
    { key: "", label: "Tümü", count: preStatus.length },
    // count>0 olanlar + (sayisi 0'a dusse bile) o an SECILI statu sekmesi gorunur kalsin;
    // aksi halde sekme kaybolur, statusFilter kalir ve liste sebepsiz bos gorunur.
    ...STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0 || s === statusFilter).map((s) => ({
      key: s,
      label: STATUS_LABEL[s],
      count: statusCounts[s] ?? 0,
    })),
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">İçerikler</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{items.length} kayıt</span>
          <Link
            href="/admin/entries/new"
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            + Yeni içerik
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-6 py-16 text-center">
          <p className="text-lg font-medium text-dark">Henüz içerik yok</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            İlk sayfanı, ürününü veya blog yazını oluşturarak başla. Oluşturduğun içerikler burada
            listelenecek.
          </p>
          <Link
            href="/admin/entries/new"
            className="mt-5 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            + İlk içeriği oluştur
          </Link>
        </div>
      ) : (
        <>
          {/* Durum sekmeleri (adetli) — birincil filtre ekseni */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
            {tabs.map((t) => {
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(t.key);
                    resetPage();
                  }}
                  className={`-mb-px border-b-2 px-3.5 py-2 text-sm transition-colors ${
                    active
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-ink-soft hover:text-primary"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs text-muted">{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* Arac cubugu: arama (genis) + tip + dil */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder="Ara (başlık/slug)…"
              aria-label="İçeriklerde ara"
              className={`w-72 ${fieldCls}`}
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                resetPage();
              }}
              aria-label="Tipe göre filtrele"
              className={fieldCls}
            >
              <option value="">Tüm tipler</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {locales.length > 1 && (
              <select
                value={localeFilter}
                onChange={(e) => {
                  setLocaleFilter(e.target.value);
                  resetPage();
                }}
                aria-label="Dile göre filtrele"
                className={fieldCls}
              >
                <option value="">Tüm diller</option>
                {locales.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </div>

          {capped && (
            <p className="mb-3 text-xs text-amber-600">
              Liste ilk {items.length}/{list?.total} kayıtla sınırlı — daha fazlası için server-side
              sayfalama gerekiyor.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase text-muted">
                <tr>
                  <th aria-sort={sortAria("title")} className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("title")}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      Başlık <span className="text-primary">{sortGlyph("title")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Tip</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Dil</th>
                  <th aria-sort={sortAria("updatedAt")} className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("updatedAt")}
                      className="inline-flex items-center gap-1 uppercase hover:text-ink"
                    >
                      Son güncelleme <span className="text-primary">{sortGlyph("updatedAt")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <p className="text-sm text-muted">Eşleşen içerik yok.</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-2 text-sm font-medium text-primary hover:underline"
                      >
                        Filtreleri temizle
                      </button>
                    </td>
                  </tr>
                )}
                {paged.map((it) => (
                  <tr key={it.id} className="group hover:bg-surface-muted">
                    <td className="px-4 py-3 font-medium text-dark">
                      <Link href={`/admin/entries/${it.id}`} className="hover:text-primary">
                        {it.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-ink-soft">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: TYPE_COLOR[it.type] ?? "#999" }}
                        />
                        {it.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[it.status ?? "DRAFT"] ?? ""}`}
                      >
                        {STATUS_LABEL[it.status ?? "DRAFT"] ?? it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft">
                        {it.localeCode}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-ink-soft"
                      title={it.updatedAt ? absoluteDateTime(it.updatedAt) : undefined}
                    >
                      {it.updatedAt ? relativeTime(it.updatedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{it.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void openPreview(it.id)}
                        title="Önizle"
                        aria-label={`${it.title} — önizle`}
                        className="text-ink-soft opacity-0 transition-opacity hover:!opacity-100 group-hover:opacity-60"
                      >
                        👁
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sorted.length > PAGE_SIZE && (
              <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-3 text-sm text-muted">
                <span>
                  {rangeStart}–{rangeEnd} / {sorted.length}
                </span>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  aria-label="Önceki sayfa"
                  className="rounded border border-line px-2 py-1 text-ink-soft hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                  aria-label="Sonraki sayfa"
                  className="rounded border border-line px-2 py-1 text-ink-soft hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
