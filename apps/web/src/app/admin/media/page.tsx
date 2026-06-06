"use client";

import { type ChangeEvent, type ReactElement, useCallback, useEffect, useState } from "react";
import { adminFetch, adminUpload, getToken } from "@/lib/admin";

interface MediaItem {
  id: string;
  url: string;
  mime: string;
  title?: string | null;
  alt?: string | null;
}
interface MediaList {
  items: MediaItem[];
  total: number;
}

export default function MediaPage(): ReactElement {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const d = await adminFetch<MediaList>("/admin/media?pageSize=48");
    setItems(d?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void load();
  }, [load]);

  async function onUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await adminUpload("/admin/media", file);
    setUploading(false);
    e.target.value = "";
    await load();
  }

  async function onDelete(id: string): Promise<void> {
    if (!window.confirm("Medya silinsin mi?")) return;
    await adminFetch(`/admin/media/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Medya</h1>
        <label className="cursor-pointer rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600">
          {uploading ? "Yükleniyor..." : "+ Dosya yükle"}
          <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">Henüz medya yok. Bir dosya yükleyin.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex aspect-video items-center justify-center bg-surface-muted">
                {m.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-xs text-muted">{m.mime}</span>
                )}
              </div>
              <div className="space-y-1 p-2">
                <input
                  readOnly
                  value={m.url}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded border border-line px-2 py-1 text-xs text-ink-soft"
                />
                <button
                  type="button"
                  onClick={() => onDelete(m.id)}
                  className="text-xs text-accent hover:underline"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
