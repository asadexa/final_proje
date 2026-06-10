"use client";

import { type ChangeEvent, type ReactElement, useState } from "react";
import { adminFetch, adminUpload } from "@/lib/admin";

export interface PickedMedia {
  id: string;
  url: string;
}
interface MediaItem {
  id: string;
  url: string;
  mime: string;
}

// Medya secici: kutuphane gridi + localden yukleme tek panelde.
// Kapak (Media id) ve blok gorselleri (url) ayni bileseni kullanir.
export function MediaPicker({
  onPick,
  label = "Kütüphaneden seç",
}: {
  onPick: (m: PickedMedia) => void;
  label?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  async function openPanel(): Promise<void> {
    const d = await adminFetch<{ items: MediaItem[] }>("/admin/media?pageSize=48");
    setItems((d?.items ?? []).filter((m) => m.mime.startsWith("image/")));
    setOpen(true);
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const created = await adminUpload<MediaItem>("/admin/media", file);
    setUploading(false);
    e.target.value = "";
    if (created) {
      onPick({ id: created.id, url: created.url });
      setOpen(false);
    }
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void openPanel())}
        className="text-sm text-primary hover:underline"
      >
        {open ? "Kapat" : label}
      </button>
      {open && (
        <div className="mt-2 w-full rounded-lg border border-line bg-surface-muted p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted">Kütüphane</span>
            <label className="cursor-pointer rounded bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary-600">
              {uploading ? "Yükleniyor..." : "+ Bilgisayardan yükle"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onUpload(e)}
                disabled={uploading}
              />
            </label>
          </div>
          <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onPick({ id: m.id, url: m.url });
                  setOpen(false);
                }}
                className="overflow-hidden rounded border border-line hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="aspect-video w-full object-cover" />
              </button>
            ))}
            {items.length === 0 && (
              <p className="col-span-4 py-4 text-center text-xs text-muted">
                Kütüphane boş — yukarıdan yükleyin.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
