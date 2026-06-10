"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { BlocksClientRender, type RenderBlock } from "@/components/admin/blocks-client-render";
import { adminFetch, getToken } from "@/lib/admin";
import { diffSnapshots, type FieldChange, type SnapshotDiff, type SnapshotLike } from "@/lib/diff";

interface VersionRow {
  version: number;
  note?: string | null;
  createdAt: string;
  createdBy?: { email: string } | null;
}
interface VersionDetail extends VersionRow {
  snapshot: SnapshotLike & { blocks?: Array<{ type: string; data?: Record<string, unknown> }> };
}

const fmt = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

function changeColor(kind: FieldChange["kind"]): string {
  return kind === "added"
    ? "bg-green-50 text-green-800"
    : kind === "removed"
      ? "bg-red-50 text-red-800"
      : "bg-amber-50 text-amber-800";
}

// Time Machine: surum zaman tuneli + gorsel onizleme + git-tarzi diff.
export default function HistoryPage(): ReactElement {
  const id = (useParams().id as string) ?? "";
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [entryTitle, setEntryTitle] = useState("");
  // Tek secim = onizleme; iki secim = karsilastirma
  const [selected, setSelected] = useState<number[]>([]);
  const [details, setDetails] = useState<Record<number, VersionDetail>>({});
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [diffMode, setDiffMode] = useState<"side" | "unified">("side");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [v, e] = await Promise.all([
      adminFetch<VersionRow[]>(`/admin/entries/${id}/versions`),
      adminFetch<{ title: string }>(`/admin/entries/${id}`),
    ]);
    setVersions(v ?? []);
    if (e) setEntryTitle(e.title);
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void Promise.resolve().then(load);
  }, [load]);

  const fetchDetail = useCallback(
    async (version: number): Promise<VersionDetail | null> => {
      if (details[version]) return details[version];
      const d = await adminFetch<VersionDetail>(`/admin/entries/${id}/versions/${version}`);
      if (d) setDetails((prev) => ({ ...prev, [version]: d }));
      return d;
    },
    [details, id],
  );

  async function toggleSelect(version: number): Promise<void> {
    setMsg("");
    const next = selected.includes(version)
      ? selected.filter((v) => v !== version)
      : [...selected, version].slice(-2); // en fazla 2 secim
    setSelected(next);
    setDiff(null);
    const dets = await Promise.all(next.map((v) => fetchDetail(v)));
    if (next.length === 2 && dets[0] && dets[1]) {
      const [oldV, newV] = next[0] < next[1] ? [next[0], next[1]] : [next[1], next[0]];
      const a = (await fetchDetail(oldV))?.snapshot;
      const b = (await fetchDetail(newV))?.snapshot;
      if (a && b) setDiff(diffSnapshots(a, b));
    }
  }

  async function restore(version: number): Promise<void> {
    if (!window.confirm(`v${version} geri yüklensin mi? (mevcut hal yeni sürüm olarak saklanır)`)) return;
    const r = await adminFetch(`/admin/entries/${id}/versions/${version}/restore`, { method: "POST" });
    if (r) {
      setMsg(`v${version} geri yüklendi ✓`);
      setSelected([]);
      setDiff(null);
      setDetails({});
      await load();
    }
  }

  const single = selected.length === 1 ? details[selected[0]] : null;
  const pair = selected.length === 2 ? [...selected].sort((x, y) => x - y) : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/admin/entries/${id}`} className="text-sm text-ink-soft hover:text-primary">
          ← Editör
        </Link>
        <h1 className="text-2xl font-bold text-dark">Zaman Tüneli</h1>
        <span className="text-sm text-muted">{entryTitle}</span>
      </div>
      {msg && <p className="mb-4 text-sm font-medium text-green-700">{msg}</p>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sol: dikey zaman cizelgesi */}
        <div className="relative">
          <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-line" aria-hidden />
          <ol className="space-y-4">
            {versions.map((v) => {
              const isSel = selected.includes(v.version);
              return (
                <li key={v.version} className="relative pl-6">
                  <span
                    className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 ${isSel ? "border-primary bg-primary" : "border-line bg-surface"}`}
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => void toggleSelect(v.version)}
                    className={`w-full rounded-lg border p-3 text-left transition ${isSel ? "border-primary bg-primary/5" : "border-line bg-surface hover:border-primary/50"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-dark">v{v.version}</span>
                      <span className="text-xs text-muted">{fmt.format(new Date(v.createdAt))}</span>
                    </div>
                    {v.note && <p className="mt-1 text-xs text-ink-soft">{v.note}</p>}
                    <p className="mt-1 text-xs text-muted">{v.createdBy?.email ?? "sistem"}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void restore(v.version)}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    Bu sürüme geri dön
                  </button>
                </li>
              );
            })}
            {versions.length === 0 && <p className="text-sm text-muted">Sürüm yok.</p>}
          </ol>
          <p className="mt-4 text-xs text-muted">
            Bir sürüm seç → görsel önizleme. İki sürüm seç → karşılaştırma.
          </p>
        </div>

        {/* Sag: onizleme veya diff */}
        <div className="min-w-0">
          {pair && diff && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark">
                  v{pair[0]} → v{pair[1]}{" "}
                  <span className="text-sm font-normal text-muted">({diff.totalChanges} değişiklik)</span>
                </h2>
                <div className="flex rounded border border-line text-sm">
                  <button
                    type="button"
                    onClick={() => setDiffMode("side")}
                    className={`px-3 py-1 ${diffMode === "side" ? "bg-primary text-white" : "text-ink-soft"}`}
                  >
                    Yan yana
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffMode("unified")}
                    className={`px-3 py-1 ${diffMode === "unified" ? "bg-primary text-white" : "text-ink-soft"}`}
                  >
                    Birleşik
                  </button>
                </div>
              </div>

              {diff.meta.length > 0 && (
                <div className="mb-4 rounded-lg border border-line bg-surface p-4">
                  <h3 className="mb-2 text-sm font-semibold text-dark">Meta / SEO</h3>
                  <ChangeList changes={diff.meta} mode={diffMode} />
                </div>
              )}

              <div className="space-y-3">
                {diff.blocks.map((bd) => (
                  <div key={bd.index} className="rounded-lg border border-line bg-surface p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-dark">
                      Blok #{bd.index + 1}
                      {bd.kind === "added" && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          + eklendi ({bd.typeB})
                        </span>
                      )}
                      {bd.kind === "removed" && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          − silindi ({bd.typeA})
                        </span>
                      )}
                      {bd.kind === "type-changed" && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          tip değişti: {bd.typeA} → {bd.typeB}
                        </span>
                      )}
                      {bd.kind === "kept" && (
                        <span className="text-xs font-normal text-muted">
                          {bd.typeA} {bd.changes.length === 0 ? "· değişiklik yok" : `· ${bd.changes.length} alan`}
                        </span>
                      )}
                    </h3>
                    {bd.changes.length > 0 && <ChangeList changes={bd.changes} mode={diffMode} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!pair && single && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark">
                  v{single.version} önizleme{" "}
                  <span className="text-sm font-normal text-muted">
                    {fmt.format(new Date(single.createdAt))} · {single.createdBy?.email ?? "sistem"}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => void restore(single.version)}
                  className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                >
                  Bu sürüme geri dön
                </button>
              </div>
              {/* Gercek bilesenlerle gorsel onizleme (uretimle birebir) */}
              <div className="overflow-hidden rounded-lg border border-line" style={{ zoom: 0.55 }}>
                <BlocksClientRender
                  blocks={(single.snapshot.blocks ?? []).map(
                    (b): RenderBlock => ({ type: b.type, data: (b.data ?? {}) as Record<string, unknown> }),
                  )}
                />
              </div>
            </div>
          )}

          {!pair && !single && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
              Soldan bir sürüm seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeList({ changes, mode }: { changes: FieldChange[]; mode: "side" | "unified" }): ReactElement {
  if (mode === "unified") {
    return (
      <ul className="space-y-1 font-mono text-xs">
        {changes.map((c) => (
          <li key={c.path + c.kind} className={`rounded px-2 py-1 ${changeColor(c.kind)}`}>
            <span className="font-semibold">{c.path}</span>
            {c.kind !== "added" && <div className="text-red-700">− {c.before}</div>}
            {c.kind !== "removed" && <div className="text-green-700">+ {c.after}</div>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-1 pr-3 font-medium">Alan</th>
            <th className="py-1 pr-3 font-medium">Önce</th>
            <th className="py-1 font-medium">Sonra</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.path + c.kind} className="border-t border-line align-top">
              <td className="py-1.5 pr-3 font-mono">{c.path}</td>
              <td className={`py-1.5 pr-3 ${c.kind !== "added" ? "bg-red-50 text-red-800" : "text-muted"}`}>
                {c.before ?? "—"}
              </td>
              <td className={`py-1.5 ${c.kind !== "removed" ? "bg-green-50 text-green-800" : "text-muted"}`}>
                {c.after ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
