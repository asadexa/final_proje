"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LoadError } from "@/components/admin/load-error";
import { adminFetch, adminRequest, adminUpload } from "@/lib/admin";
import { absoluteDateTime, relativeTime } from "@/lib/datetime";
import { useAdminGuard } from "@/lib/use-admin-guard";

interface MediaItem {
  id: string;
  url: string;
  mime: string;
  title?: string | null;
  alt?: string | null;
  size?: number;
  width?: number | null;
  height?: number | null;
  createdAt?: string | null;
}
interface MediaList {
  items: MediaItem[];
  total: number;
}

// Insan-okur dosya boyutu (B/KB/MB/GB).
function formatBytes(n?: number): string {
  if (!n || n <= 0) return "—";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export default function MediaPage(): ReactElement {
  const ready = useAdminGuard();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const r = await adminRequest<MediaList>("/admin/media?pageSize=200");
    if (r.ok) setItems(r.data?.items ?? []);
    else setError(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    // setState'i effect'ten mikro-goreve ertele (react-hooks/set-state-in-effect)
    if (ready) void Promise.resolve().then(load);
  }, [ready, load]);

  // Coklu yukleme: yalniz gorseller, sirayla; ilerleme sayaci guncellenir.
  const uploadFiles = useCallback(
    async (files: File[]): Promise<void> => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return;
      setProgress({ done: 0, total: imgs.length });
      for (let i = 0; i < imgs.length; i++) {
        await adminUpload("/admin/media", imgs[i]);
        setProgress({ done: i + 1, total: imgs.length });
      }
      setProgress(null);
      await load();
    },
    [load],
  );

  async function onInput(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await uploadFiles(files);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDragActive(false);
    void uploadFiles(Array.from(e.dataTransfer.files));
  }

  async function onDelete(id: string): Promise<void> {
    if (!window.confirm("Medya silinsin mi?")) return;
    await adminFetch(`/admin/media/${id}`, { method: "DELETE" });
    await load();
  }

  // Kutuphane benzersiz varlik gosterir: ayni URL'e isaret eden kayitlari grupla.
  // (Seed kapaklari entry basina ayri Media yaratiyor -> ayni dosya birden cok satir.)
  const groups = useMemo(() => {
    const byUrl = new Map<string, { rep: MediaItem; ids: string[] }>();
    for (const m of items) {
      const g = byUrl.get(m.url);
      if (g) g.ids.push(m.id);
      else byUrl.set(m.url, { rep: m, ids: [m.id] });
    }
    return Array.from(byUrl.values());
  }, [items]);

  const uploading = progress !== null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragActive) setDragActive(true);
      }}
      onDragLeave={(e) => {
        // yalniz kapsayicinin kendisinden cikinca kapat (cocuk gecislerinde titremesin)
        if (e.currentTarget === e.target) setDragActive(false);
      }}
      onDrop={onDrop}
      className={`rounded-lg ${dragActive ? "outline outline-2 outline-dashed outline-primary" : ""}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Medya</h1>
        <label className="cursor-pointer rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600">
          {uploading ? `Yükleniyor ${progress?.done}/${progress?.total}...` : "+ Dosya yükle"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onInput}
            disabled={uploading}
          />
        </label>
      </div>

      {dragActive && (
        <p className="mb-4 rounded-lg border border-dashed border-primary bg-primary/5 px-3 py-6 text-center text-sm font-medium text-primary">
          Görselleri buraya bırakın…
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Yükleniyor...</p>
      ) : error ? (
        <LoadError onRetry={() => void load()} label="Medya yüklenemedi — sunucuya ulaşılamadı." />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">
          Henüz medya yok. Bir dosya yükleyin veya görselleri bu alana sürükleyin.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {groups.map(({ rep: m, ids }) => (
            <div key={m.url} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="relative flex aspect-video items-center justify-center bg-surface-muted">
                {m.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-xs text-muted">{m.mime}</span>
                )}
                {ids.length > 1 && (
                  <span
                    title={`${ids.length} kayıt bu dosyaya işaret ediyor (içerik kapağı olarak kullanımda)`}
                    className="absolute right-1.5 top-1.5 rounded bg-dark/75 px-1.5 py-0.5 text-xs font-medium text-white"
                  >
                    {ids.length}× kullanım
                  </span>
                )}
              </div>
              <div className="space-y-1 p-2">
                <input
                  readOnly
                  value={m.url}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded border border-line px-2 py-1 text-xs text-ink-soft"
                />
                <p
                  className="truncate text-[11px] text-muted"
                  title={m.createdAt ? absoluteDateTime(m.createdAt) : undefined}
                >
                  {formatBytes(m.size)}
                  {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                  {m.createdAt ? ` · ${relativeTime(m.createdAt)}` : ""}
                </p>
                <div className="flex items-center gap-3">
                  {/* Tekrar kullanim: URL'i bloklarin image.url alanina yapistirmak icin */}
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(m.url)}
                    className="text-xs text-primary hover:underline"
                  >
                    URL kopyala
                  </button>
                  {ids.length > 1 ? (
                    <span
                      className="text-xs text-muted"
                      title="Birden çok içerikte kullanımda — silmek için önce içeriklerden kaldırın."
                    >
                      kullanımda
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
