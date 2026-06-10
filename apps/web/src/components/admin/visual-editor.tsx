"use client";

import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { BLOCK_FORMS, BlockForm } from "./block-form";
import { BlocksClientRender, type RenderBlock } from "./blocks-client-render";

// Gorsel Duzenleme Modu (Webflow-lite):
// - Solda GERCEK sayfa (uretimdeki ayni bilesenler, BlocksClientRender)
// - Bloga hover -> cerceve; tikla -> sagda o blogun formu
// - Form degisikligi onizlemeye ANINDA yansir (ayni state, sunucu turu yok)
// - Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), masaustu/mobil viewport, kaydet mevcut PATCH ile
// Bilincli sapma: metin dogrudan sayfa uzerinde contentEditable degil; secilen blogun
// formu yanda acilir (veri butunlugu + Zod validasyonu korunur — decision-log).

export interface VisualBlock {
  type: string;
  data: Record<string, unknown>;
}

const HISTORY_LIMIT = 50;
const COALESCE_MS = 700; // ardisik tus vuruslari tek undo adimi olsun

export function VisualEditor({
  blocks,
  onChange,
  title,
  saving,
  dirty,
  onSave,
  onExit,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  blocks: VisualBlock[];
  onChange: (blocks: VisualBlock[]) => void;
  title: string;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  onExit: () => void;
  onAddBlock: (type: string) => void;
  onRemoveBlock: (index: number) => void;
  onMoveBlock: (index: number, dir: -1 | 1) => void;
}): ReactElement {
  const [sel, setSel] = useState<number | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [addOpen, setAddOpen] = useState(false);
  // Undo/redo: blok dizisi anlik goruntuleri (ref'te stack, butonlar icin state bayraklari)
  const past = useRef<VisualBlock[][]>([]);
  const future = useRef<VisualBlock[][]>([]);
  const lastPush = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHist = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const record = useCallback(
    (next: VisualBlock[]) => {
      const now = Date.now();
      // kisa araliktaki degisiklikler tek adimda birlesir (tus vurusu basina undo olmasin)
      if (now - lastPush.current > COALESCE_MS) {
        past.current = [...past.current.slice(-HISTORY_LIMIT), blocks];
        future.current = [];
      }
      lastPush.current = now;
      onChange(next);
      syncHist();
    },
    [blocks, onChange, syncHist],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(blocks);
    lastPush.current = 0;
    onChange(prev);
    syncHist();
  }, [blocks, onChange, syncHist]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(blocks);
    lastPush.current = 0;
    onChange(next);
    syncHist();
  }, [blocks, onChange, syncHist]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const renderBlocks: RenderBlock[] = blocks.map((b) => ({ type: b.type, data: b.data }));
  const selBlock = sel !== null ? blocks[sel] : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-muted">
      {/* Ust arac cubugu */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        <button type="button" onClick={onExit} className="text-sm text-ink-soft hover:text-primary">
          ← Form editörüne dön
        </button>
        <span className="truncate text-sm font-medium text-dark">{title}</span>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Görsel Düzenleme
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Geri al (Ctrl+Z)"
            className="rounded border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-primary hover:text-primary disabled:opacity-40"
          >
            ↩ Geri al
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Yinele (Ctrl+Shift+Z)"
            className="rounded border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-primary hover:text-primary disabled:opacity-40"
          >
            ↪ Yinele
          </button>
          <div className="mx-1 flex rounded border border-line text-sm">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`px-2.5 py-1 ${viewport === "desktop" ? "bg-primary text-white" : "text-ink-soft"}`}
              title="Masaüstü görünüm"
            >
              🖥
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`px-2.5 py-1 ${viewport === "mobile" ? "bg-primary text-white" : "text-ink-soft"}`}
              title="Mobil görünüm (responsive kontrol)"
            >
              📱
            </button>
          </div>
          {dirty && <span className="text-xs text-amber-600">kaydedilmedi</span>}
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded bg-primary px-5 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 grow">
        {/* Canli onizleme — gercek bilesenler */}
        <div className="min-w-0 grow overflow-auto p-4">
          <div
            className={`mx-auto overflow-hidden rounded-lg border border-line bg-surface shadow-sm ${viewport === "mobile" ? "w-[390px]" : ""}`}
            style={viewport === "desktop" ? { zoom: 0.62, width: 1280 } : undefined}
          >
            <BlocksClientRender blocks={renderBlocks} onBlockClick={setSel} selectedIndex={sel ?? undefined} />
          </div>
        </div>

        {/* Sag panel: secili blogun formu */}
        <aside className="w-[400px] shrink-0 overflow-y-auto border-l border-line bg-surface p-4">
          {selBlock ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-dark">
                  #{(sel ?? 0) + 1} {selBlock.type}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <button type="button" onClick={() => sel !== null && onMoveBlock(sel, -1)} className="text-ink-soft hover:text-primary" title="Yukarı taşı">↑</button>
                  <button type="button" onClick={() => sel !== null && onMoveBlock(sel, 1)} className="text-ink-soft hover:text-primary" title="Aşağı taşı">↓</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sel !== null && window.confirm("Blok silinsin mi?")) {
                        onRemoveBlock(sel);
                        setSel(null);
                      }
                    }}
                    className="text-accent hover:underline"
                  >
                    Sil
                  </button>
                </div>
              </div>
              {BLOCK_FORMS[selBlock.type] ? (
                <BlockForm
                  type={selBlock.type}
                  data={selBlock.data}
                  onChange={(data) => {
                    if (sel === null) return;
                    const next = blocks.map((b, i) => (i === sel ? { ...b, data } : b));
                    record(next);
                  }}
                />
              ) : (
                <p className="text-sm text-muted">
                  Bu blok tipi ({selBlock.type}) görsel modda düzenlenemiyor; form editörünü kullanın.
                </p>
              )}
            </div>
          ) : (
            <div className="text-sm text-ink-soft">
              <p className="mb-3 font-medium text-dark">Düzenlemek için soldan bir bloğa tıklayın.</p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
                <li>Hover: blok çerçevesi + adı görünür</li>
                <li>Tıkla: bloğun alanları burada açılır</li>
                <li>Her değişiklik önizlemeye anında yansır</li>
                <li>Ctrl+Z geri al · Ctrl+Shift+Z yinele</li>
              </ul>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setAddOpen((o) => !o)}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Blok ekle
            </button>
            {addOpen && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {Object.keys(BLOCK_FORMS).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onAddBlock(t);
                      setAddOpen(false);
                      setSel(blocks.length); // yeni blok sona eklenir
                    }}
                    className="rounded border border-line px-2 py-1.5 text-left text-xs text-ink-soft hover:border-primary hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
