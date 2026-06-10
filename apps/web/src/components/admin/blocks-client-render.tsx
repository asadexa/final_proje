"use client";

import type { ReactElement } from "react";
import { REGISTRY } from "@/components/blocks-view";

export interface RenderBlock {
  type: string;
  data: Record<string, unknown>;
}

// Bloklarin CLIENT tarafinda renderi — public sitedeki AYNI bilesenler
// (blocks-view REGISTRY) kullanilir => onizleme uretimle birebir.
// Veri ceken bloklar (BLOG_CAROUSEL, CONTACT_FORM) sunucu/fetch gerektirir;
// burada yer tutucu seritle gosterilir.
const DATA_BLOCKS: Record<string, string> = {
  BLOG_CAROUSEL: "Blog karuseli — son yazılar yayında otomatik listelenir",
  CONTACT_FORM: "Form — yayında tanımlı form alanlarıyla render edilir",
};

export function BlocksClientRender({
  blocks,
  onBlockClick,
  selectedIndex,
}: {
  blocks: RenderBlock[];
  // Gorsel editor: bloga tiklayinca formuna odaklanmak icin (opsiyonel)
  onBlockClick?: (index: number) => void;
  selectedIndex?: number;
}): ReactElement {
  return (
    <div className="bg-surface-muted">
      {blocks.map((b, i) => {
        const placeholder = DATA_BLOCKS[b.type];
        const Component = REGISTRY[b.type];
        const inner = placeholder ? (
          <div className="border-y border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            {placeholder}
          </div>
        ) : Component ? (
          <Component data={b.data} />
        ) : (
          <div className="border-y border-dashed border-line bg-surface px-6 py-6 text-center text-xs text-muted">
            Bilinmeyen blok: {b.type}
          </div>
        );
        if (!onBlockClick) return <div key={i}>{inner}</div>;
        return (
          // Gorsel editor modu: hover cerceve + tiklanabilir blok
          <div
            key={i}
            onClick={() => onBlockClick(i)}
            className={`group relative cursor-pointer ${selectedIndex === i ? "outline outline-2 outline-primary" : "hover:outline hover:outline-2 hover:outline-primary/50"}`}
          >
            <span
              className={`absolute left-2 top-2 z-10 rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-white ${selectedIndex === i ? "" : "opacity-0 transition-opacity group-hover:opacity-100"}`}
            >
              #{i + 1} {b.type}
            </span>
            {/* tiklamalar editore gider; icerideki linkler gezinmesin */}
            <div className="pointer-events-none">{inner}</div>
          </div>
        );
      })}
      {blocks.length === 0 && (
        <p className="px-6 py-16 text-center text-sm text-muted">Henüz blok yok.</p>
      )}
    </div>
  );
}
