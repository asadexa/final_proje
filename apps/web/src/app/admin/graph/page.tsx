"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, getToken } from "@/lib/admin";

interface GraphNode {
  id: string;
  slug: string;
  title: string;
  type: string;
  localeCode: string;
  status: string;
}
interface GraphLink {
  source: string;
  target: string;
  kind: "link" | "translation";
}
interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const TYPE_COLOR: Record<string, string> = {
  PAGE: "#1563ff",
  PRODUCT: "#03c065",
  POST: "#f59e0b",
};
const COL_X: Record<string, number> = { PAGE: 140, PRODUCT: 520, POST: 900 };

// Icerik iliski grafigi: dugum = entry (tip kolonu + dil sirasi),
// duz kenar = ic link, kesikli = ceviri grubu. Yetim (gelen linki olmayan)
// dugumler kirmizi halkayla vurgulanir. Zoom: tekerlek, pan: surukle.
export default function GraphPage(): ReactElement {
  const router = useRouter();
  const [data, setData] = useState<GraphData | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState({ x: 0, y: 0, w: 1100, h: 800 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/admin/login";
      return;
    }
    void adminFetch<GraphData>("/admin/entries/graph").then((d) => setData(d));
  }, []);

  // Yerlesim: tip kolonlari, kolon icinde locale->title sirali dikey dizilim
  const layout = useMemo(() => {
    if (!data) return new Map<string, { x: number; y: number }>();
    const pos = new Map<string, { x: number; y: number }>();
    const groups: Record<string, GraphNode[]> = { PAGE: [], PRODUCT: [], POST: [] };
    for (const n of data.nodes) (groups[n.type] ?? (groups[n.type] = [])).push(n);
    for (const [type, nodes] of Object.entries(groups)) {
      nodes.sort((a, b) => a.localeCode.localeCompare(b.localeCode) || a.slug.localeCompare(b.slug));
      nodes.forEach((n, i) => {
        // tr sol alt-kolon, en sag alt-kolon
        const dx = n.localeCode === "tr" ? 0 : 180;
        pos.set(n.id, { x: (COL_X[type] ?? 140) + dx, y: 60 + i * 34 - (n.localeCode === "en" ? Math.floor(nodes.filter((m) => m.localeCode === "tr").length) * 34 : 0) });
      });
    }
    return pos;
  }, [data]);

  const incoming = useMemo(() => {
    const set = new Set<string>();
    for (const l of data?.links ?? []) if (l.kind === "link") set.add(l.target);
    return set;
  }, [data]);

  if (!data) return <p className="text-sm text-muted">Yükleniyor...</p>;

  const q = query.trim().toLowerCase();
  const matches = (n: GraphNode): boolean =>
    q === "" || n.title.toLowerCase().includes(q) || n.slug.includes(q);

  function onWheel(e: React.WheelEvent): void {
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    setView((v) => ({ x: v.x, y: v.y, w: Math.min(4000, Math.max(300, v.w * factor)), h: Math.min(3000, Math.max(220, v.h * factor)) }));
  }
  function onMouseDown(e: React.MouseEvent): void {
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent): void {
    if (!drag.current || !svgRef.current) return;
    const scale = view.w / svgRef.current.clientWidth;
    setView((v) => ({ ...v, x: v.x - (e.clientX - (drag.current?.x ?? 0)) * scale, y: v.y - (e.clientY - (drag.current?.y ?? 0)) * scale }));
    drag.current = { x: e.clientX, y: e.clientY };
  }

  const orphans = data.nodes.filter((n) => !incoming.has(n.id) && n.slug !== "home").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-dark">İçerik İlişki Grafiği</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara (başlık/slug)…"
          className="rounded border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          {Object.entries(TYPE_COLOR).map(([t, c]) => (
            <span key={t} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: c }} /> {t}
            </span>
          ))}
          <span>— düz: iç link · kesikli: çeviri · kırmızı halka: yetim ({orphans})</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        className="h-[72vh] w-full cursor-grab rounded-lg border border-line bg-surface active:cursor-grabbing"
        role="img"
        aria-label="İçerik ilişki grafiği"
      >
        {/* kolon basliklari */}
        {Object.entries(COL_X).map(([t, x]) => (
          <text key={t} x={x + 80} y={28} textAnchor="middle" fontSize={14} fontWeight={700} fill="#666">
            {t}
          </text>
        ))}
        {/* kenarlar */}
        {data.links.map((l, i) => {
          const a = layout.get(l.source);
          const b = layout.get(l.target);
          if (!a || !b) return null;
          const dim = q !== "" ; // arama varken kenarlari soluklastir
          return (
            <path
              key={i}
              d={`M ${a.x + 70} ${a.y} C ${(a.x + b.x) / 2 + 90} ${a.y}, ${(a.x + b.x) / 2 - 90} ${b.y}, ${b.x - 6} ${b.y}`}
              fill="none"
              stroke={l.kind === "translation" ? "#bbb" : "#1563ff"}
              strokeWidth={l.kind === "translation" ? 1 : 1.4}
              strokeDasharray={l.kind === "translation" ? "4 4" : undefined}
              opacity={dim ? 0.15 : l.kind === "translation" ? 0.5 : 0.45}
            />
          );
        })}
        {/* dugumler */}
        {data.nodes.map((n) => {
          const p = layout.get(n.id);
          if (!p) return null;
          const hit = matches(n);
          const orphan = !incoming.has(n.id) && n.slug !== "home";
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              opacity={hit ? 1 : 0.18}
              className="cursor-pointer"
              onClick={() => router.push(`/admin/entries/${n.id}`)}
            >
              {orphan && <circle r={9} cx={0} cy={0} fill="none" stroke="#ef4444" strokeWidth={2} />}
              <circle r={6} fill={TYPE_COLOR[n.type] ?? "#999"} opacity={n.status === "PUBLISHED" ? 1 : 0.4} />
              <text x={12} y={4} fontSize={11} fill="#333">
                <tspan fontWeight={600}>{n.localeCode}</tspan> /{n.slug.length > 26 ? `${n.slug.slice(0, 24)}…` : n.slug}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted">
        Tekerlek: yakınlaştır · sürükle: kaydır · düğüme tıkla: editörde aç · soluk düğüm: yayında değil
      </p>
    </div>
  );
}
