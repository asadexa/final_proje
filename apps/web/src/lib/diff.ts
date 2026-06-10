// Icerik surumu karsilastirma motoru (Time Machine / Diff Viewer).
// Saf fonksiyonlar — unit testlenebilir, UI'dan bagimsiz.

export interface FieldChange {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: string;
  after?: string;
}

export interface BlockDiff {
  index: number;
  kind: "added" | "removed" | "kept" | "type-changed";
  typeA?: string;
  typeB?: string;
  changes: FieldChange[];
}

export interface SnapshotLike {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  status?: string;
  blocks?: Array<{ type: string; data?: unknown }>;
  seo?: Record<string, unknown> | null;
}

// Ic ice JSON'u "path -> ilkel deger" haritasina duzlestir (diff icin).
export function flatten(v: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (v === null || v === undefined) return out;
  if (Array.isArray(v)) {
    v.forEach((item, i) => flatten(item, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      flatten(val, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out.set(prefix, String(v));
  return out;
}

// Iki duz haritayi karsilastir.
export function diffMaps(a: Map<string, string>, b: Map<string, string>): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const [path, before] of a) {
    if (!b.has(path)) changes.push({ path, kind: "removed", before });
    else if (b.get(path) !== before) changes.push({ path, kind: "changed", before, after: b.get(path) });
  }
  for (const [path, after] of b) {
    if (!a.has(path)) changes.push({ path, kind: "added", after });
  }
  return changes.sort((x, y) => x.path.localeCompare(y.path));
}

// Blok dizilerini sirayla esle: ayni indeks karsilastirilir,
// fazlalik eklendi/silindi sayilir. (Basit ve aciklanabilir strateji;
// blok tasima "sil + ekle" olarak gorunur — bilincli sadelik.)
export function diffBlocks(
  a: Array<{ type: string; data?: unknown }>,
  b: Array<{ type: string; data?: unknown }>,
): BlockDiff[] {
  const result: BlockDiff[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const ba = a[i];
    const bb = b[i];
    if (ba && !bb) {
      result.push({ index: i, kind: "removed", typeA: ba.type, changes: [] });
    } else if (!ba && bb) {
      result.push({ index: i, kind: "added", typeB: bb.type, changes: [] });
    } else if (ba && bb) {
      if (ba.type !== bb.type) {
        result.push({ index: i, kind: "type-changed", typeA: ba.type, typeB: bb.type, changes: [] });
      } else {
        const changes = diffMaps(flatten(ba.data), flatten(bb.data));
        result.push({ index: i, kind: "kept", typeA: ba.type, typeB: bb.type, changes });
      }
    }
  }
  return result;
}

// Meta + SEO alanlari (baslik/slug/ozet/durum + seo.*)
export function diffMeta(a: SnapshotLike, b: SnapshotLike): FieldChange[] {
  const pick = (s: SnapshotLike): Record<string, unknown> => ({
    title: s.title,
    slug: s.slug,
    excerpt: s.excerpt ?? undefined,
    status: s.status,
    seo: s.seo
      ? Object.fromEntries(
          Object.entries(s.seo).filter(([k]) => !["id", "entryId", "createdAt", "updatedAt"].includes(k)),
        )
      : undefined,
  });
  return diffMaps(flatten(pick(a)), flatten(pick(b)));
}

export interface SnapshotDiff {
  meta: FieldChange[];
  blocks: BlockDiff[];
  totalChanges: number;
}

export function diffSnapshots(a: SnapshotLike, b: SnapshotLike): SnapshotDiff {
  const meta = diffMeta(a, b);
  const blocks = diffBlocks(a.blocks ?? [], b.blocks ?? []);
  const totalChanges =
    meta.length +
    blocks.reduce((n, bd) => n + (bd.kind === "kept" ? bd.changes.length : 1), 0);
  return { meta, blocks, totalChanges };
}
