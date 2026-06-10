// Icerik Saglik Denetimi — KURAL TABANLI (AI'siz, deterministik).
// SEO / erisilebilirlik / UX / GEO kurallari saf fonksiyonlarla calisir:
// ayni girdi = ayni cikti -> guvenilir demo + unit testlenebilir.

export type HealthSeverity = 'error' | 'warning' | 'info';

export interface HealthFinding {
  severity: HealthSeverity;
  code: string;
  message: string;
  where?: string;
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
  } | null;
}

// data icindeki tum {url, alt} ciftlerini bul (gorsel erisilebilirlik denetimi)
function findImages(v: unknown, path: string, out: Array<{ path: string; url: string; alt?: string }>): void {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) {
    v.forEach((item, i) => findImages(item, `${path}.${i}`, out));
    return;
  }
  const obj = v as Record<string, unknown>;
  if (typeof obj.url === 'string' && obj.url.trim() !== '') {
    out.push({ path, url: obj.url, alt: typeof obj.alt === 'string' ? obj.alt : undefined });
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

export function checkContentHealth(entry: HealthInput): HealthFinding[] {
  const findings: HealthFinding[] = [];
  const seo = entry.seo ?? {};

  // --- yapi ---
  if (entry.blocks.length === 0) {
    findings.push({ severity: 'error', code: 'no-blocks', message: 'İçerikte hiç blok yok — sayfa boş render olur.' });
  }
  if ((entry.type === 'PAGE' || entry.type === 'PRODUCT') && entry.blocks[0] && entry.blocks[0].type !== 'HERO') {
    findings.push({
      severity: 'info',
      code: 'no-hero-first',
      message: `İlk blok HERO değil (${entry.blocks[0].type}) — sayfa girişi zayıf olabilir.`,
      where: 'blok #1',
    });
  }

  // --- SEO ---
  const md = seo.metaDescription?.trim() ?? '';
  if (md === '') {
    findings.push({ severity: 'warning', code: 'meta-desc-missing', message: 'Meta description boş — arama sonucu snippet’i Google’a kalır.' });
  } else if (md.length < 50) {
    findings.push({ severity: 'info', code: 'meta-desc-short', message: `Meta description kısa (${md.length} kr; öneri 50–160).` });
  } else if (md.length > 160) {
    findings.push({ severity: 'warning', code: 'meta-desc-long', message: `Meta description uzun (${md.length} kr) — arama sonucunda kesilir.` });
  }
  const mt = (seo.metaTitle ?? entry.title).trim();
  if (mt.length > 60) {
    findings.push({ severity: 'warning', code: 'title-long', message: `Başlık ${mt.length} karakter — arama sonucunda ~60’ta kesilir.` });
  }
  if (seo.robotsIndex === false) {
    findings.push({ severity: 'warning', code: 'noindex', message: 'Sayfa NOINDEX — arama motorlarına kapalı. Bilinçli mi?' });
  }
  if (seo.canonicalUrl && !seo.canonicalUrl.startsWith('http')) {
    findings.push({ severity: 'error', code: 'canonical-relative', message: 'Canonical URL mutlak (https://...) olmalı.' });
  }
  if (entry.type === 'POST' && !(entry.excerpt ?? '').trim()) {
    findings.push({ severity: 'warning', code: 'excerpt-missing', message: 'Özet (excerpt) boş — blog listesinde ve OG açıklamasında kullanılır.' });
  }

  // --- erisilebilirlik: alt metinsiz gorseller ---
  for (const [i, b] of entry.blocks.entries()) {
    const images: Array<{ path: string; url: string; alt?: string }> = [];
    findImages(b.data, b.type, images);
    for (const img of images) {
      if (!img.alt || img.alt.trim() === '') {
        findings.push({
          severity: 'warning',
          code: 'img-alt-missing',
          message: 'Görselin alt metni yok (erişilebilirlik + görsel SEO).',
          where: `blok #${i + 1} ${img.path}`,
        });
      }
    }
  }

  // --- UX / donusum ---
  if (
    (entry.type === 'PAGE' || entry.type === 'PRODUCT') &&
    entry.blocks.length > 0 &&
    !entry.blocks.some((b) => hasLink(b.data))
  ) {
    findings.push({ severity: 'warning', code: 'no-cta', message: 'Sayfada hiç bağlantı/CTA yok — ziyaretçi için sonraki adım tanımsız.' });
  }

  // --- GEO ---
  if (entry.type === 'PRODUCT' && !entry.blocks.some((b) => b.type === 'FAQ')) {
    findings.push({
      severity: 'info',
      code: 'no-faq',
      message: 'FAQ bloğu yok — FAQPage structured data üretilmiyor (GEO/LLM görünürlüğü için önerilir).',
    });
  }

  // --- HTML hijyeni: RICH_TEXT icinde h1 (sayfada cift h1 riski) ---
  for (const [i, b] of entry.blocks.entries()) {
    if (b.type === 'RICH_TEXT') {
      const html = String((b.data as Record<string, unknown> | undefined)?.html ?? '');
      if (/<h1[\s>]/i.test(html)) {
        findings.push({
          severity: 'warning',
          code: 'rich-text-h1',
          message: 'RICH_TEXT içinde <h1> var — sayfada çift h1 oluşur (h2/h3 kullanın).',
          where: `blok #${i + 1}`,
        });
      }
    }
  }

  return findings;
}
