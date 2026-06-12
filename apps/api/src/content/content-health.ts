// Icerik Saglik Denetimi — KURAL TABANLI (AI'siz, deterministik).
// Her kontrol bir kategoriye (Yapi/SEO/Erisilebilirlik/UX/GEO) aittir; GECEN
// kontroller de raporlanir ve 0-100 bir saglik skoru uretilir.
// Saf fonksiyon: ayni girdi = ayni cikti -> guvenilir demo + unit testlenebilir.

export type HealthSeverity = 'error' | 'warning' | 'info';
export type HealthCategory = 'structure' | 'seo' | 'a11y' | 'ux' | 'geo';

export const CATEGORY_LABELS: Record<HealthCategory, string> = {
  structure: 'Yapı',
  seo: 'SEO',
  a11y: 'Erişilebilirlik',
  ux: 'UX / Dönüşüm',
  geo: 'GEO',
};

// Skor cezalari (100'den dusulur, taban 0).
const PENALTY: Record<HealthSeverity, number> = {
  error: 20,
  warning: 10,
  info: 4,
};

export interface HealthFinding {
  severity: HealthSeverity;
  category: HealthCategory;
  code: string;
  message: string;
  where?: string;
}

export interface HealthPassed {
  category: HealthCategory;
  code: string;
  label: string;
}

export interface HealthCategoryScore {
  category: HealthCategory;
  label: string;
  score: number;
  findings: number;
  passed: number;
}

export interface HealthResult {
  score: number; // 0-100 (genel)
  findings: HealthFinding[];
  passed: HealthPassed[];
  summary: {
    error: number;
    warning: number;
    info: number;
    passed: number; // gecen kontrol sayisi
    total: number; // uygulanabilir kontrol sayisi
  };
  categories: HealthCategoryScore[];
}

export interface HealthInput {
  type: string;
  title: string;
  excerpt?: string | null;
  blocks: Array<{ type: string; data?: unknown }>;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    canonicalUrl?: string | null;
    robotsIndex?: boolean;
    ogTitle?: string | null;
    ogDescription?: string | null;
  } | null;
}

// Bir kontrolun ciktisi: null = uygulanamaz (sayilmaz), [] = GECTI, [..] = bulgu(lar).
type CheckOutput = Array<Omit<HealthFinding, 'category' | 'code'>> | null;

interface CheckDef {
  code: string;
  category: HealthCategory;
  label: string; // kontrolun ne dogruladigi ("Meta açıklama")
  run: (e: HealthInput) => CheckOutput;
}

// --- yardimcilar ---

// data icindeki tum {url, alt} ciftlerini bul (gorsel erisilebilirlik denetimi)
function findImages(
  v: unknown,
  path: string,
  out: Array<{ path: string; url: string; alt?: string }>,
): void {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) {
    v.forEach((item, i) => findImages(item, `${path}.${i}`, out));
    return;
  }
  const obj = v as Record<string, unknown>;
  if (typeof obj.url === 'string' && obj.url.trim() !== '') {
    out.push({
      path,
      url: obj.url,
      alt: typeof obj.alt === 'string' ? obj.alt : undefined,
    });
  }
  for (const [k, val] of Object.entries(obj)) findImages(val, `${path}.${k}`, out);
}

// data icinde herhangi bir dolu href var mi (CTA varligi denetimi)
function hasLink(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some(hasLink);
  const obj = v as Record<string, unknown>;
  if (typeof obj.href === 'string' && obj.href.trim() !== '') return true;
  return Object.values(obj).some(hasLink);
}

// Bloklardaki tum kullaniciya acik metni topla (ince icerik denetimi icin kelime sayisi)
function countWords(blocks: HealthInput['blocks']): number {
  const parts: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      const s = v.trim();
      if (s && !s.startsWith('/') && !s.startsWith('http') && !/^[a-z0-9_-]+$/.test(s)) {
        parts.push(s.replace(/<[^>]+>/g, ' '));
      }
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object')
      Object.values(v as Record<string, unknown>).forEach(walk);
  };
  blocks.forEach((b) => walk(b.data));
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

function isPageLike(e: HealthInput): boolean {
  return e.type === 'PAGE' || e.type === 'PRODUCT';
}

// --- kontrol tanimlari ---

const CHECKS: CheckDef[] = [
  // ===== YAPI =====
  {
    code: 'has-blocks',
    category: 'structure',
    label: 'Sayfada blok var',
    run: (e) =>
      e.blocks.length === 0
        ? [{ severity: 'error', message: 'İçerikte hiç blok yok — sayfa boş render olur.' }]
        : [],
  },
  {
    code: 'hero-first',
    category: 'structure',
    label: 'İlk blok HERO',
    run: (e) => {
      if (!isPageLike(e) || e.blocks.length === 0) return null;
      return e.blocks[0].type !== 'HERO'
        ? [
            {
              severity: 'info',
              message: `İlk blok HERO değil (${e.blocks[0].type}) — sayfa girişi zayıf olabilir.`,
              where: 'blok #1',
            },
          ]
        : [];
    },
  },

  // ===== SEO =====
  {
    code: 'meta-title',
    category: 'seo',
    label: 'Başlık uzunluğu',
    run: (e) => {
      const t = (e.seo?.metaTitle ?? e.title).trim();
      if (t === '')
        return [{ severity: 'warning', message: 'Başlık boş — arama sonucunda görünmez.' }];
      if (t.length < 15)
        return [
          {
            severity: 'info',
            message: `Başlık çok kısa (${t.length} kr; öneri 30–60) — anahtar kelime için yer var.`,
          },
        ];
      if (t.length > 60)
        return [
          {
            severity: 'warning',
            message: `Başlık ${t.length} karakter — arama sonucunda ~60’ta kesilir.`,
          },
        ];
      return [];
    },
  },
  {
    code: 'meta-desc',
    category: 'seo',
    label: 'Meta açıklama',
    run: (e) => {
      const md = e.seo?.metaDescription?.trim() ?? '';
      if (md === '')
        return [
          {
            severity: 'warning',
            message: 'Meta description boş — arama snippet’i Google’a kalır.',
          },
        ];
      if (md.length < 50)
        return [
          { severity: 'info', message: `Meta description kısa (${md.length} kr; öneri 50–160).` },
        ];
      if (md.length > 160)
        return [
          {
            severity: 'warning',
            message: `Meta description uzun (${md.length} kr) — arama sonucunda kesilir.`,
          },
        ];
      return [];
    },
  },
  {
    code: 'og-fields',
    category: 'seo',
    label: 'Open Graph alanları',
    run: (e) => {
      const ogT = e.seo?.ogTitle?.trim() ?? '';
      const ogD = e.seo?.ogDescription?.trim() ?? '';
      if (ogT === '' || ogD === '')
        return [
          {
            severity: 'info',
            message:
              'OG Title/Description eksik — sosyal paylaşımda meta alanlarına düşer, kontrolü kaybedersiniz.',
          },
        ];
      return [];
    },
  },
  {
    code: 'canonical',
    category: 'seo',
    label: 'Canonical URL',
    run: (e) => {
      const c = e.seo?.canonicalUrl;
      if (c && !c.startsWith('http'))
        return [{ severity: 'error', message: 'Canonical URL mutlak (https://...) olmalı.' }];
      return [];
    },
  },
  {
    code: 'indexable',
    category: 'seo',
    label: 'Indexlenebilir',
    run: (e) =>
      e.seo?.robotsIndex === false
        ? [
            {
              severity: 'warning',
              message: 'Sayfa NOINDEX — arama motorlarına kapalı. Bilinçli mi?',
            },
          ]
        : [],
  },
  {
    code: 'excerpt',
    category: 'seo',
    label: 'Özet (blog)',
    run: (e) => {
      if (e.type !== 'POST') return null;
      return (e.excerpt ?? '').trim() === ''
        ? [
            {
              severity: 'warning',
              message: 'Özet (excerpt) boş — blog listesinde ve OG açıklamasında kullanılır.',
            },
          ]
        : [];
    },
  },
  {
    code: 'rich-text-h1',
    category: 'seo',
    label: 'Başlık hiyerarşisi (tek h1)',
    run: (e) => {
      const out: Array<Omit<HealthFinding, 'category' | 'code'>> = [];
      e.blocks.forEach((b, i) => {
        if (b.type !== 'RICH_TEXT') return;
        const raw = (b.data as Record<string, unknown> | undefined)?.html;
        const html = typeof raw === 'string' ? raw : '';
        if (/<h1[\s>]/i.test(html))
          out.push({
            severity: 'warning',
            message: 'RICH_TEXT içinde <h1> var — sayfada çift h1 oluşur (h2/h3 kullanın).',
            where: `blok #${i + 1}`,
          });
      });
      return out;
    },
  },

  // ===== ERISILEBILIRLIK =====
  {
    code: 'img-alt',
    category: 'a11y',
    label: 'Görsel alt metinleri',
    run: (e) => {
      const out: Array<Omit<HealthFinding, 'category' | 'code'>> = [];
      e.blocks.forEach((b, i) => {
        const imgs: Array<{ path: string; url: string; alt?: string }> = [];
        findImages(b.data, b.type, imgs);
        for (const img of imgs) {
          if (!img.alt || img.alt.trim() === '')
            out.push({
              severity: 'warning',
              message: 'Görselin alt metni yok (erişilebilirlik + görsel SEO).',
              where: `blok #${i + 1} ${img.path}`,
            });
        }
      });
      return out;
    },
  },

  // ===== UX / DONUSUM =====
  {
    code: 'cta',
    category: 'ux',
    label: 'Bağlantı / CTA',
    run: (e) => {
      if (!isPageLike(e) || e.blocks.length === 0) return null;
      return !e.blocks.some((b) => hasLink(b.data))
        ? [
            {
              severity: 'warning',
              message: 'Sayfada hiç bağlantı/CTA yok — ziyaretçi için sonraki adım tanımsız.',
            },
          ]
        : [];
    },
  },
  {
    code: 'thin-content',
    category: 'ux',
    label: 'İçerik derinliği',
    run: (e) => {
      if (e.blocks.length === 0) return null;
      const words = countWords(e.blocks);
      return words < 30
        ? [
            {
              severity: 'warning',
              message: `İçerik çok ince (${words} kelime) — arama ve GEO için yetersiz, gövde metni ekleyin.`,
            },
          ]
        : [];
    },
  },

  // ===== GEO =====
  {
    code: 'faq',
    category: 'geo',
    label: 'FAQ bloğu',
    run: (e) => {
      if (!isPageLike(e)) return null;
      return !e.blocks.some((b) => b.type === 'FAQ')
        ? [
            {
              severity: 'info',
              message:
                'FAQ bloğu yok — FAQPage structured data üretilmiyor (GEO/LLM görünürlüğü için önerilir).',
            },
          ]
        : [];
    },
  },
  {
    code: 'heading-structure',
    category: 'geo',
    label: 'Bölüm başlıkları',
    run: (e) => {
      if (e.blocks.length < 3) return null;
      const hasHeading =
        e.blocks.some((b) => b.type === 'SECTION_HEADING') ||
        e.blocks.some((b) => {
          if (b.type !== 'RICH_TEXT') return false;
          const raw = (b.data as Record<string, unknown> | undefined)?.html;
          return typeof raw === 'string' && /<h2[\s>]/i.test(raw);
        });
      return hasHeading
        ? []
        : [
            {
              severity: 'info',
              message:
                'Belirgin bölüm başlığı (SECTION_HEADING/h2) yok — uzun sayfada tarama ve GEO ayrıştırması zayıflar.',
            },
          ];
    },
  },
];

export function checkContentHealth(entry: HealthInput): HealthResult {
  const findings: HealthFinding[] = [];
  const passed: HealthPassed[] = [];

  // Kategori bazli ceza birikimi (skor icin)
  const catPenalty: Record<HealthCategory, number> = {
    structure: 0,
    seo: 0,
    a11y: 0,
    ux: 0,
    geo: 0,
  };
  const catApplied: Record<HealthCategory, { passed: number; findings: number }> = {
    structure: { passed: 0, findings: 0 },
    seo: { passed: 0, findings: 0 },
    a11y: { passed: 0, findings: 0 },
    ux: { passed: 0, findings: 0 },
    geo: { passed: 0, findings: 0 },
  };

  for (const check of CHECKS) {
    const out = check.run(entry);
    if (out === null) continue; // uygulanamaz
    if (out.length === 0) {
      passed.push({ category: check.category, code: check.code, label: check.label });
      catApplied[check.category].passed += 1;
      continue;
    }
    for (const f of out) {
      findings.push({ ...f, category: check.category, code: check.code });
      catPenalty[check.category] += PENALTY[f.severity];
      catApplied[check.category].findings += 1;
    }
  }

  const totalPenalty = Object.values(catPenalty).reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  const summary = {
    error: findings.filter((f) => f.severity === 'error').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
    passed: passed.length,
    total: passed.length + findings.length,
  };

  const categories: HealthCategoryScore[] = (
    Object.keys(CATEGORY_LABELS) as HealthCategory[]
  )
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      score: Math.max(0, 100 - catPenalty[cat]),
      findings: catApplied[cat].findings,
      passed: catApplied[cat].passed,
    }))
    .filter((c) => c.findings > 0 || c.passed > 0);

  return { score, findings, passed, summary, categories };
}
