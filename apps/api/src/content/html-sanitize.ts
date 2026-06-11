// HTML sanitizasyon kapisi — XSS savunmasi (Zod kapisindan SONRA ikinci kapi).
// RICH_TEXT.html ve bazi baslik alanlari render'da dangerouslySetInnerHTML ile
// basildigi icin, kullanici/AI uretimi HTML DB'ye yazilmadan once temizlenir.
//
// Yaklasim BLACKLIST DEGIL WHITELIST: once TUM ozel karakterler escape edilir,
// ardindan yalnizca izinli etiketler geri acilir. Boylece <script>/<img onerror>/
// <svg onload> gibi hicbir etiket hayatta kalamaz — cunku cikti yalnizca literal
// izinli etiketleri icerir. Kendi parser'imizi yazmaya gerek yok; "escape-then-
// restore" deseni izinli kume kucuk + nitelik-siz oldugunda kanitlanabilir guvenli.

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeAll(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

// Baslik alanlari: krontech mavi vurgu icin yalniz <b>; ayrica <strong>/<em>/<br>.
const TEXT_TAGS = ['b', 'strong', 'em', 'br'];
// RICH_TEXT govdesi: tipik bicimlendirme etiketleri (nitelik-siz).
const RICH_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
];

// Escape edilmis metinde yalniz izinli etiketleri geri ac (nitelik tasimaz).
function restoreTags(s: string, tags: string[]): string {
  for (const t of tags) {
    s = s
      .replace(new RegExp(`&lt;${t}&gt;`, 'gi'), `<${t}>`)
      .replace(new RegExp(`&lt;/${t}&gt;`, 'gi'), `</${t}>`)
      .replace(new RegExp(`&lt;${t}\\s*/&gt;`, 'gi'), `<${t}>`);
  }
  return s;
}

// RICH_TEXT icin <a href> — yalniz guvenli sema. javascript:/data: engellenir.
// URL zaten escape edildigi icin nitelik kacisi (") imkansiz; sadece sema kontrolu.
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
function restoreLinks(s: string): string {
  s = s.replace(
    /&lt;a\s+href=&quot;((?:(?!&quot;).)*?)&quot;\s*&gt;/gi,
    (_m, url: string) =>
      SAFE_HREF.test(url) ? `<a href="${url}" rel="noopener nofollow">` : '<a>',
  );
  return s.replace(/&lt;\/a&gt;/gi, '</a>');
}

// Baslik politikasi: yalniz inline vurgu etiketleri.
export function sanitizeTextHtml(input: string): string {
  return restoreTags(escapeAll(input), TEXT_TAGS);
}

// Zengin metin politikasi: bicimlendirme + guvenli linkler.
export function sanitizeRichHtml(input: string): string {
  return restoreLinks(restoreTags(escapeAll(input), RICH_TAGS));
}

type Json = Record<string, unknown>;

function sanitizeArrayTitles(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return (value as unknown[]).map((el) =>
    el && typeof el === 'object' && typeof (el as Json).title === 'string'
      ? {
          ...(el as Json),
          title: sanitizeTextHtml((el as Json).title as string),
        }
      : el,
  );
}

// Blok tipine gore HTML tasiyabilen alanlari temizler. Render'da
// dangerouslySetInnerHTML kullanilan alanlarla birebir eslesir (blocks-view.tsx,
// hero-slide.tsx, testimonial-slider.tsx). Diger alanlar React ile otomatik
// escape edildigi icin ellenmez (cift-escape olmamasi icin).
export function sanitizeBlockData(type: string, data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d: Json = { ...(data as Json) };

  switch (type) {
    case 'HERO': {
      if (typeof d.title === 'string') d.title = sanitizeTextHtml(d.title);
      if (Array.isArray(d.slides)) d.slides = sanitizeArrayTitles(d.slides);
      break;
    }
    case 'VALUE_PROP':
    case 'CASE_STUDY':
    case 'MEDIA_TEXT': {
      if (typeof d.title === 'string') d.title = sanitizeTextHtml(d.title);
      break;
    }
    case 'TESTIMONIAL': {
      if (Array.isArray(d.items)) d.items = sanitizeArrayTitles(d.items);
      break;
    }
    case 'RICH_TEXT': {
      if (typeof d.html === 'string') d.html = sanitizeRichHtml(d.html);
      break;
    }
    default:
      break;
  }

  return d;
}
