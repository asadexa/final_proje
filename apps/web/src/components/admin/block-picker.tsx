"use client";

import { type ReactElement, useState } from "react";
import { BLOCK_CATALOG } from "./block-catalog";
import { BlocksClientRender } from "./blocks-client-render";

// Iki adimli blok secici:
//  1) solda kullanici-dostu adlar + aciklamalar
//  2) tipe tiklayinca sagda HAZIR TASARIM ORNEKLERI — gercek bilesenlerle
//     kucuk olcekte CANLI render (statik gorsel degil) -> "ne ekleyecegimi goruyorum"
export function BlockPicker({
  onPick,
  onClose,
}: {
  onPick: (type: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}): ReactElement {
  const [selected, setSelected] = useState<string>("HERO");
  const meta = BLOCK_CATALOG[selected];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sol: blok listesi */}
        <div className="w-[300px] shrink-0 overflow-y-auto border-r border-line bg-surface-muted p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-dark">Blok Ekle</h3>
            <button type="button" onClick={onClose} className="text-sm text-muted hover:text-dark">✕</button>
          </div>
          <ul className="space-y-1">
            {Object.entries(BLOCK_CATALOG).map(([type, m]) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => setSelected(type)}
                  className={`w-full rounded-lg p-2.5 text-left transition ${selected === type ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-surface"}`}
                >
                  <span className="block text-sm font-medium text-dark">{m.title}</span>
                  <span className="block text-[11px] leading-snug text-muted">{m.desc}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted/70">{type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Sag: secili tipin hazir ornekleri (canli mini-onizleme) */}
        <div className="min-w-0 grow overflow-y-auto p-5">
          <h4 className="text-base font-semibold text-dark">{meta.title}</h4>
          <p className="mb-4 text-sm text-ink-soft">{meta.desc}</p>
          <div className="space-y-5">
            {meta.presets.map((p) => (
              <div key={p.name} className="overflow-hidden rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-2">
                  <div>
                    <span className="text-sm font-medium text-dark">{p.name}</span>
                    {p.desc && <span className="ml-2 text-xs text-muted">{p.desc}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(selected, structuredClone(p.data))}
                    className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    + Bu tasarımla ekle
                  </button>
                </div>
                {/* canli mini-onizleme: ayni REGISTRY bilesenleri, kucuk olcek */}
                <div className="pointer-events-none max-h-[260px] overflow-hidden bg-surface-muted" style={{ zoom: 0.45 }}>
                  <BlocksClientRender blocks={[{ type: selected, data: p.data }]} />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onPick(selected, {})}
              className="text-sm text-ink-soft underline hover:text-primary"
            >
              Ya da boş {meta.title} ekle (alanları kendim doldururum)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
