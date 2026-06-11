import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  validateBlockData,
  type BlockType,
  type EntryType,
} from '@kron/shared';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../prisma/prisma.service';

// AI Site Architect: dogal dil promptundan TASLAK sayfa uretir.
// Guvenlik modeli: LLM ciktisi serbest metin DEGIL — JSON parse edilir ve her blok
// @kron/shared Zod semasindan (validateBlockData) gecmeden DB'ye yazilamaz.
// ANTHROPIC_API_KEY yoksa deterministik SABLON moduna duser (demo bagimliligi yok).

export interface ArchitectResult {
  entryId: string;
  slug: string;
  usedAi: boolean;
  droppedBlocks: string[]; // sema dogrulamasini gecemeyen bloklar (tip listesi)
  note?: string;
}

interface DraftPage {
  title: string;
  excerpt?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
}

// LLM'e verilen blok katalogu — @kron/shared semalarinin kisa izdusumu.
const BLOCK_CATALOG = `
Kullanabilecegin blok tipleri ve data alanlari (BASKA TIP KULLANMA):
- HERO: { title (zorunlu, <b>..</b> mavi vurgu), subtitle?, eyebrow?, cta?: {label,href}, image?: {url,alt} }
- SECTION_HEADING: { title (zorunlu), intro?, align?: "left"|"center" }
- FEATURE_GRID: { title?, items: [{ title (zorunlu), description?, icon? }] }
- VALUE_PROP: { title (zorunlu), body (zorunlu), cta?: {label,href}, image?: {url,alt} }
- STATS: { title?, subtitle?, items: [{ value (zorunlu), label (zorunlu) }] }
- MEDIA_TEXT: { title?, body (zorunlu), image: {url?,alt?}, imageSide?: "left"|"right", cta?: {label,href} }
- RICH_TEXT: { html (zorunlu; h2/h3/p/ul kullan) }
- FAQ: { title?, items: [{ question (zorunlu), answer (zorunlu) }] }
- CTA_BANNER: { title (zorunlu), cta: {label (zorunlu), href (zorunlu)} }
- CONTACT_FORM: { title?, formKey (zorunlu; "contact" kullan), consentText? }
`.trim();

interface EntryWithBlocksAndSeo {
  id: string;
  type: string;
  localeCode: string;
  slug: string;
  title: string;
  excerpt: string | null;
  groupId: string | null;
  status: string;
  blocks: Array<{
    type: string;
    order: number;
    enabled: boolean;
    data: Record<string, unknown>;
  }>;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    robotsIndex: boolean;
    robotsFollow: boolean;
    ogTitle: string | null;
    ogDescription: string | null;
  } | null;
}

interface TranslatedData {
  title: string;
  excerpt: string | null;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robotsIndex?: boolean;
    robotsFollow?: boolean;
    ogTitle?: string;
    ogDescription?: string;
  };
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly content: ContentService,
    private readonly prisma: PrismaService,
  ) {}

  async architect(
    prompt: string,
    localeCode: string,
    userId: string,
    userRole: string,
  ): Promise<ArchitectResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let draft: DraftPage;
    let usedAi = false;
    let note: string | undefined;

    if (apiKey) {
      draft = await this.generateWithClaude(apiKey, prompt, localeCode);
      usedAi = true;
    } else {
      draft = this.templateFallback(prompt, localeCode);
      note =
        'ANTHROPIC_API_KEY tanimli degil — deterministik sablon modu kullanildi.';
    }

    // Zod kapisi: gecemeyen blok DB'ye giremez (dusurulur ve raporlanir)
    const dropped: string[] = [];
    const validBlocks = draft.blocks.filter((b) => {
      const r = validateBlockData(b.type as BlockType, b.data);
      if (!r.success) {
        this.logger.warn(`AI blok dustu (${b.type}): ${r.error}`);
        dropped.push(b.type);
        return false;
      }
      return true;
    });

    if (validBlocks.length === 0) {
      throw new BadRequestException(
        'Uretilen hicbir blok sema dogrulamasini gecemedi.',
      );
    }

    const slug = await this.uniqueSlug(this.slugify(draft.title), localeCode);
    const entry = await this.content.create(
      {
        type: 'PAGE',
        localeCode,
        slug,
        title: draft.title,
        excerpt: draft.excerpt,
        status: 'DRAFT',
        blocks: validBlocks.map((b, i) => ({
          type: b.type as BlockType,
          order: i,
          data: b.data,
        })),
        seo: draft.seo,
      },
      userId,
      userRole,
    );
    return { entryId: entry.id, slug, usedAi, droppedBlocks: dropped, note };
  }

  // --------------------------- Claude (resmi SDK) ---------------------------

  private async generateWithClaude(
    apiKey: string,
    prompt: string,
    localeCode: string,
  ): Promise<DraftPage> {
    const client = new Anthropic({ apiKey });
    const lang = localeCode === 'tr' ? 'Turkce' : 'Ingilizce';
    const system = [
      "Kurumsal bir siber guvenlik sirketi (Kron Technologies benzeri) CMS'i icin sayfa tasarlayan bir mimar asistansin.",
      `Icerik dili: ${lang}.`,
      BLOCK_CATALOG,
      'YANIT KURALI: YALNIZ gecerli JSON dondur (markdown cit yok, aciklama yok):',
      '{ "title": "...", "excerpt": "...", "seo": { "metaTitle": "...", "metaDescription": "50-160 karakter" }, "blocks": [{ "type": "...", "data": { ... } }] }',
      'Iyi bir sayfa: HERO ile basla, 4-7 blok kullan, FAQ ekle (GEO/SEO icin), CTA_BANNER veya CONTACT_FORM ile bitir. Linkler /' +
        localeCode +
        '/contact gibi yerel yollara isaret etsin.',
    ].join('\n\n');

    try {
      const response = await client.messages.create({
        model: process.env.AI_MODEL ?? 'claude-opus-4-8',
        max_tokens: 16000,
        thinking: { type: 'enabled', budget_tokens: 10000 },
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text',
      );
      const text = textBlocks.map((b) => b.text).join('');
      return this.parseDraft(text);
    } catch (err: unknown) {
      if (err instanceof Anthropic.APIError) {
        this.logger.error(
          `Claude API hatasi ${String(err.status)}: ${err.message}`,
        );
        throw new BadRequestException(
          `AI uretimi basarisiz (API ${String(err.status)}). Sablon modu icin key'i kaldirin.`,
        );
      }
      throw err;
    }
  }

  private parseDraft(text: string): DraftPage {
    // Olasi markdown citlerini temizle, ilk { ... son } arasini al
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start)
      throw new BadRequestException('AI ciktisi JSON degil.');
    const parsed = JSON.parse(text.slice(start, end + 1)) as DraftPage;
    if (!parsed.title || !Array.isArray(parsed.blocks)) {
      throw new BadRequestException('AI ciktisinda title/blocks eksik.');
    }
    return parsed;
  }

  // --------------------------- Sablon fallback ---------------------------

  // Key yoksa: ayni cikti sozlesmesini ureten deterministik iskelet.
  private templateFallback(prompt: string, localeCode: string): DraftPage {
    const tr = localeCode === 'tr';
    const title = prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
    const contact = `/${localeCode}/contact`;
    return {
      title,
      excerpt: tr
        ? `${title} hakkinda bilgi sayfasi.`
        : `Information page about ${title}.`,
      seo: {
        metaTitle: title,
        metaDescription: tr
          ? `${title} — ozellikler, faydalar ve sik sorulan sorular. Demo icin bize ulasin.`
          : `${title} — features, benefits and FAQ. Contact us for a demo.`,
      },
      blocks: [
        {
          type: 'HERO',
          data: {
            title,
            subtitle: tr
              ? 'Bu taslak AI Mimar sablonundan uretildi — editorde duzenleyin.'
              : 'Draft generated by the Architect template — edit in the editor.',
            cta: {
              label: tr ? 'Demo Talep Et' : 'Request a Demo',
              href: contact,
            },
          },
        },
        {
          type: 'FEATURE_GRID',
          data: {
            title: tr ? 'One Cikan Ozellikler' : 'Key Features',
            items: [
              {
                title: tr ? 'Ozellik 1' : 'Feature 1',
                description: tr
                  ? 'Aciklamayi duzenleyin.'
                  : 'Edit this description.',
              },
              {
                title: tr ? 'Ozellik 2' : 'Feature 2',
                description: tr
                  ? 'Aciklamayi duzenleyin.'
                  : 'Edit this description.',
              },
              {
                title: tr ? 'Ozellik 3' : 'Feature 3',
                description: tr
                  ? 'Aciklamayi duzenleyin.'
                  : 'Edit this description.',
              },
            ],
          },
        },
        {
          type: 'FAQ',
          data: {
            title: tr ? 'Sik Sorulan Sorular' : 'Frequently Asked Questions',
            items: [
              {
                question: tr ? `${title} nedir?` : `What is ${title}?`,
                answer: tr ? 'Cevabi duzenleyin.' : 'Edit this answer.',
              },
              {
                question: tr ? 'Nasil baslarim?' : 'How do I get started?',
                answer: tr ? 'Cevabi duzenleyin.' : 'Edit this answer.',
              },
            ],
          },
        },
        {
          type: 'CTA_BANNER',
          data: {
            title: tr ? `${title} ile tanisin` : `See ${title} in action`,
            cta: {
              label: tr ? 'Demo Talep Et' : 'Request a Demo',
              href: contact,
            },
          },
        },
      ],
    };
  }

  // --------------------------- yardimcilar ---------------------------

  private slugify(s: string): string {
    const map: Record<string, string> = {
      ç: 'c',
      ğ: 'g',
      ı: 'i',
      ö: 'o',
      ş: 's',
      ü: 'u',
      Ç: 'c',
      Ğ: 'g',
      İ: 'i',
      Ö: 'o',
      Ş: 's',
      Ü: 'u',
    };
    return (
      s
        .split('')
        .map((ch) => map[ch] ?? ch)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'yeni-sayfa'
    );
  }

  private async uniqueSlug(base: string, localeCode: string): Promise<string> {
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const exists = await this.prisma.entry.findUnique({
        where: { localeCode_slug: { localeCode, slug } },
        select: { id: true },
      });
      if (!exists) return slug;
      slug = `${base}-${i}`;
    }
    throw new BadRequestException('Benzersiz slug uretilemedi.');
  }

  // --------------------------- 1. AI SEO Önerileri ---------------------------

  async healthSuggestions(id: string): Promise<{
    suggestions: Array<{
      severity: 'info' | 'warning' | 'error';
      message: string;
      recommendation: string;
    }>;
  }> {
    const rawEntry = await this.content.findOne(id);
    const entry = rawEntry as unknown as EntryWithBlocksAndSeo;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      return this.healthSuggestionsWithClaude(apiKey, entry);
    }

    // Fallback: Deterministik öneriler
    const suggestions: Array<{
      severity: 'info' | 'warning' | 'error';
      message: string;
      recommendation: string;
    }> = [];
    const isTr = entry.localeCode === 'tr';

    if (entry.type === 'PRODUCT') {
      suggestions.push({
        severity: 'info',
        message: isTr
          ? 'Ürün detayları için teknik özellikler tablosu veya şema eklenebilir.'
          : 'Technical specs table or schema can be added for product details.',
        recommendation: isTr
          ? 'Ürün özelliklerini detaylandıran bir FEATURE_GRID veya RICH_TEXT tablosu ekleyin.'
          : 'Add a FEATURE_GRID or RICH_TEXT table detailing product features.',
      });
      suggestions.push({
        severity: 'warning',
        message: isTr
          ? 'Sayfa içi görsel zenginlik yetersiz görünüyor.'
          : 'On-page visual richness seems insufficient.',
        recommendation: isTr
          ? 'Sayfanın değer teklifini desteklemek için en az bir adet MEDIA_TEXT bloğu ekleyin.'
          : 'Add at least one MEDIA_TEXT block to support the page value proposition.',
      });
    } else if (entry.type === 'PAGE') {
      suggestions.push({
        severity: 'info',
        message: isTr
          ? 'Sayfa akışı referanslarla zenginleştirilebilir.'
          : 'Page flow can be enriched with references.',
        recommendation: isTr
          ? 'Ziyaretçi güvenini artırmak için referans veya TESTIMONIAL bloğu eklemeyi düşünün.'
          : 'Consider adding a reference or TESTIMONIAL block to increase visitor trust.',
      });
    } else if (entry.type === 'POST') {
      suggestions.push({
        severity: 'info',
        message: isTr
          ? 'Okuyucu etkileşimi artırılabilir.'
          : 'Reader engagement can be increased.',
        recommendation: isTr
          ? 'Yazının sonuna ilgili diğer blog yazılarına yönlendiren bir BLOG_CAROUSEL ekleyin.'
          : 'Add a BLOG_CAROUSEL directing to other related blog posts at the end.',
      });
    }

    return { suggestions };
  }

  private async healthSuggestionsWithClaude(
    apiKey: string,
    entry: EntryWithBlocksAndSeo,
  ): Promise<{
    suggestions: Array<{
      severity: 'info' | 'warning' | 'error';
      message: string;
      recommendation: string;
    }>;
  }> {
    const client = new Anthropic({ apiKey });
    const system = [
      'Kurumsal siber guvenlik web sitesi icin SEO ve erisilebilirlik uzmanisin.',
      'Verilen sayfa icerigini (baslik, ozet, seo alanlari ve bloklar) analiz et ve qualitative SEO, erisilebilirlik ve okunabilirlik onerileri uret.',
      'Cikti formatı JSON formatinda olmalidir. Yanitta baska hicbir metin olmamalidir.',
      'Format:',
      '{ "suggestions": [ { "severity": "info"|"warning"|"error", "message": "Sorunun aciklamasi", "recommendation": "Nasil duzeltilecegine dair cozum onerisi" } ] }',
    ].join('\n\n');

    const inputData = {
      title: entry.title,
      excerpt: entry.excerpt,
      seo: entry.seo,
      blocks: entry.blocks.map((b) => ({ type: b.type, data: b.data })),
    };

    try {
      const response = await client.messages.create({
        model: process.env.AI_MODEL ?? 'claude-opus-4-8',
        max_tokens: 4000,
        thinking: { type: 'enabled', budget_tokens: 2000 },
        system,
        messages: [
          { role: 'user', content: JSON.stringify(inputData, null, 2) },
        ],
      });
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text',
      );
      const text = textBlocks.map((b) => b.text).join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) return { suggestions: [] };
      return JSON.parse(text.slice(start, end + 1)) as {
        suggestions: Array<{
          severity: 'info' | 'warning' | 'error';
          message: string;
          recommendation: string;
        }>;
      };
    } catch {
      return { suggestions: [] };
    }
  }

  // --------------------------- 2. AI Çeviri Yardımı ---------------------------

  async translateEntry(
    id: string,
    targetLocale: string,
    userId: string,
    userRole: string,
  ): Promise<{ entryId: string; slug: string }> {
    const rawOriginal = await this.content.findOne(id);
    const original = rawOriginal as unknown as EntryWithBlocksAndSeo;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    let translated: TranslatedData;

    if (apiKey) {
      translated = await this.translateWithClaude(
        apiKey,
        original,
        targetLocale,
      );
    } else {
      translated = {
        title:
          targetLocale === 'en'
            ? `${original.title} (EN)`
            : `${original.title} (TR)`,
        excerpt: original.excerpt
          ? targetLocale === 'en'
            ? `${original.excerpt} (Translated)`
            : `${original.excerpt} (Çevrildi)`
          : null,
        seo: original.seo
          ? {
              metaTitle: original.seo.metaTitle
                ? targetLocale === 'en'
                  ? `${original.seo.metaTitle} (EN)`
                  : `${original.seo.metaTitle} (TR)`
                : undefined,
              metaDescription: original.seo.metaDescription
                ? targetLocale === 'en'
                  ? `${original.seo.metaDescription} (EN)`
                  : `${original.seo.metaDescription} (TR)`
                : undefined,
              canonicalUrl: original.seo.canonicalUrl ?? undefined,
              robotsIndex: original.seo.robotsIndex,
              robotsFollow: original.seo.robotsFollow,
              ogTitle: original.seo.ogTitle
                ? targetLocale === 'en'
                  ? `${original.seo.ogTitle} (EN)`
                  : `${original.seo.ogTitle} (TR)`
                : undefined,
              ogDescription: original.seo.ogDescription
                ? targetLocale === 'en'
                  ? `${original.seo.ogDescription} (EN)`
                  : `${original.seo.ogDescription} (TR)`
                : undefined,
            }
          : undefined,
        blocks: original.blocks.map((b) => ({
          type: b.type,
          data: this.translateValue(b.data, targetLocale) as Record<
            string,
            unknown
          >,
        })),
      };
    }

    // Zod validation (kapısı)
    const validBlocks = translated.blocks.map((b, i: number) => {
      const r = validateBlockData(b.type as BlockType, b.data);
      if (!r.success) {
        this.logger.warn(
          `Cevrilen AI blogu dogrulanamadi (${b.type}): ${r.error}`,
        );
        return { type: b.type as BlockType, order: i, data: {} };
      }
      return { type: b.type as BlockType, order: i, data: b.data };
    });

    const existing = await this.prisma.entry.findFirst({
      where: {
        groupId: original.groupId ?? undefined,
        localeCode: targetLocale,
      },
    });

    if (existing) {
      await this.content.update(
        existing.id,
        {
          title: translated.title,
          excerpt: translated.excerpt ?? undefined,
          blocks: validBlocks,
          seo: translated.seo,
        },
        userId,
        userRole,
      );
      return { entryId: existing.id, slug: existing.slug };
    } else {
      const slug = await this.uniqueSlug(
        this.slugify(translated.title),
        targetLocale,
      );
      const newEntry = await this.content.create(
        {
          type: original.type as EntryType,
          localeCode: targetLocale,
          slug,
          title: translated.title,
          excerpt: translated.excerpt ?? undefined,
          groupId: original.groupId ?? undefined,
          status: 'DRAFT',
          blocks: validBlocks,
          seo: translated.seo,
        },
        userId,
        userRole,
      );
      return { entryId: newEntry.id, slug };
    }
  }

  private async translateWithClaude(
    apiKey: string,
    original: EntryWithBlocksAndSeo,
    targetLocale: string,
  ): Promise<TranslatedData> {
    const client = new Anthropic({ apiKey });
    const targetLang = targetLocale === 'tr' ? 'Turkce' : 'Ingilizce';
    const sourceLang = targetLocale === 'tr' ? 'Ingilizce' : 'Turkce';

    const system = [
      "Kurumsal bir siber guvenlik sirketi CMS'i icin ceviri asistanisin.",
      `Kaynak dil: ${sourceLang}, Hedef dil: ${targetLang}.`,
      'Sana verilen JSON icerigindeki tum kullaniciya acik metinleri (basliklar, aciklamalar, buton metinleri, meta alanlari) hedef dile cevir.',
      "YAPI KURALI: JSON yapisini, anahtarlarini (keys), id'leri, URL'leri, gorsel yollarini ve tip alanlarini (type, order) KESINLIKLE degistirme. Yalnızca metin iceriklerini cevir.",
      'YANIT KURALI: YALNIZ gecerli JSON dondur (markdown cit yok, aciklama yok):',
      '{ "title": "...", "excerpt": "...", "seo": { "metaTitle": "...", "metaDescription": "..." }, "blocks": [{ "type": "...", "data": { ... } }] }',
    ].join('\n\n');

    const inputData = {
      title: original.title,
      excerpt: original.excerpt,
      seo: original.seo
        ? {
            metaTitle: original.seo.metaTitle,
            metaDescription: original.seo.metaDescription,
            ogTitle: original.seo.ogTitle,
            ogDescription: original.seo.ogDescription,
          }
        : null,
      blocks: original.blocks.map((b) => ({
        type: b.type,
        data: b.data,
      })),
    };

    try {
      const response = await client.messages.create({
        model: process.env.AI_MODEL ?? 'claude-opus-4-8',
        max_tokens: 16000,
        thinking: { type: 'enabled', budget_tokens: 10000 },
        system,
        messages: [
          { role: 'user', content: JSON.stringify(inputData, null, 2) },
        ],
      });
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text',
      );
      const text = textBlocks.map((b) => b.text).join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start)
        throw new BadRequestException('AI ceviri ciktisi JSON degil.');
      const parsed = JSON.parse(text.slice(start, end + 1)) as TranslatedData;
      if (!parsed.title || !Array.isArray(parsed.blocks)) {
        throw new BadRequestException(
          'AI ceviri ciktisinda title/blocks eksik.',
        );
      }
      return parsed;
    } catch (err: unknown) {
      this.logger.error(
        `Claude ceviri hatasi: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'AI ile ceviri islemi basarisiz oldu. Sablon modu kullanilabilir.',
      );
    }
  }

  private translateValue(val: unknown, target: string): unknown {
    if (typeof val === 'string') {
      const s = val.trim();
      if (
        s === '' ||
        s.startsWith('/') ||
        s.startsWith('http') ||
        s.includes('.') ||
        s.length < 3
      ) {
        return val;
      }
      return target === 'en' ? `${s} (EN)` : `${s} (TR)`;
    }
    if (Array.isArray(val)) {
      return val.map((v) => this.translateValue(v, target));
    }
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (
          [
            'formKey',
            'type',
            'icon',
            'mediaId',
            'imageSide',
            'align',
            'variant',
          ].includes(k)
        ) {
          next[k] = v;
        } else {
          next[k] = this.translateValue(v, target);
        }
      }
      return next;
    }
    return val;
  }

  // --------------------------- 3. AI İçerik Analizi ---------------------------

  async analyzeContent(id: string): Promise<{
    readabilityScore: number;
    tone: string;
    suggestions: string[];
  }> {
    const rawEntry = await this.content.findOne(id);
    const entry = rawEntry as unknown as EntryWithBlocksAndSeo;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      return this.analyzeContentWithClaude(apiKey, entry);
    }

    // Fallback: Basit analiz
    const isTr = entry.localeCode === 'tr';
    let textLength = 0;
    for (const b of entry.blocks) {
      const text = JSON.stringify(b.data);
      textLength += text.length;
    }

    const readabilityScore =
      textLength < 200 ? 88 : textLength < 1000 ? 76 : 65;
    const tone = isTr ? 'Profesyonel & Kurumsal' : 'Professional & Corporate';

    const suggestions = isTr
      ? [
          'Okunabilirliği artırmak için uzun paragrafları (150+ kelime) bölün.',
          'Daha fazla listeleme ve kalın (bold) vurgu kullanarak taranabilirliği artırın.',
          'Teknik siber güvenlik terimlerinin yanına kısa açıklamalar ekleyin.',
        ]
      : [
          'Break down long paragraphs (150+ words) to improve readability.',
          'Use more bulleted lists and bold highlights to increase scannability.',
          'Provide brief explanations next to technical cybersecurity terms.',
        ];

    return { readabilityScore, tone, suggestions };
  }

  private async analyzeContentWithClaude(
    apiKey: string,
    entry: EntryWithBlocksAndSeo,
  ): Promise<{
    readabilityScore: number;
    tone: string;
    suggestions: string[];
  }> {
    const client = new Anthropic({ apiKey });
    const system = [
      'Kurumsal siber guvenlik web sitesi icin editoryal analiz uzmanisin.',
      'Verilen sayfa icerigini (baslik, ozet ve bloklar) editoryal ton, okunabilirlik ve cumle yapisi acisindan analiz et.',
      'Okunabilirlik skoru (readabilityScore) 0-100 arasinda bir sayi olmalidir.',
      "Ton (tone) ozetleyici bir ifade olmalidir (orn. 'Profesyonel & Guvenlik Odakli').",
      'Cozum onerileri (suggestions) dizisi 3 adet editoryal tavsiye icermelidir.',
      'Cikti formatı JSON formatinda olmalidir. Yanitta baska hicbir metin olmamalidir.',
      'Format:',
      '{ "readabilityScore": 85, "tone": "...", "suggestions": ["...", "...", "..."] }',
    ].join('\n\n');

    const inputData = {
      title: entry.title,
      excerpt: entry.excerpt,
      blocks: entry.blocks.map((b) => ({ type: b.type, data: b.data })),
    };

    try {
      const response = await client.messages.create({
        model: process.env.AI_MODEL ?? 'claude-opus-4-8',
        max_tokens: 4000,
        thinking: { type: 'enabled', budget_tokens: 2000 },
        system,
        messages: [
          { role: 'user', content: JSON.stringify(inputData, null, 2) },
        ],
      });
      const textBlocks = response.content.filter(
        (b): b is TextBlock => b.type === 'text',
      );
      const text = textBlocks.map((b) => b.text).join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start)
        return { readabilityScore: 70, tone: 'Profesyonel', suggestions: [] };
      return JSON.parse(text.slice(start, end + 1)) as {
        readabilityScore: number;
        tone: string;
        suggestions: string[];
      };
    } catch {
      return { readabilityScore: 70, tone: 'Profesyonel', suggestions: [] };
    }
  }
}
