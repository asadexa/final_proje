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
    entryType: EntryType = 'PAGE',
  ): Promise<ArchitectResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let draft: DraftPage;
    let usedAi = false;
    let note: string | undefined;

    if (apiKey) {
      const ai = await this.generateWithClaude(
        apiKey,
        prompt,
        localeCode,
        entryType,
      );
      if (ai) {
        draft = ai;
        usedAi = true;
      } else {
        draft = this.templateFallback(prompt, localeCode);
        note =
          'AI uretimi basarisiz oldu — deterministik sablon modu kullanildi.';
      }
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
        type: entryType,
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
    entryType: EntryType,
  ): Promise<DraftPage | null> {
    const lang = localeCode === 'tr' ? 'Turkce' : 'Ingilizce';
    const typeLabel =
      entryType === 'POST'
        ? 'blog yazisi'
        : entryType === 'PRODUCT'
          ? 'urun sayfasi'
          : 'kurumsal sayfa';
    const flow =
      entryType === 'POST'
        ? 'Blog yazisi akisi: HERO (baslik + kisa giris) ile basla; govdeyi BIRDEN COK RICH_TEXT bloguyla yaz (h2/h3/p/ul ile makale derinligi); uygunsa FAQ ekle; CTA_BANNER ile bitir. Pazarlama bloklari (STATS/FEATURE_GRID) yerine ICERIK agirlikli ol.'
        : entryType === 'PRODUCT'
          ? 'Urun sayfasi akisi: HERO ile basla; FEATURE_GRID + VALUE_PROP + STATS ile degeri anlat; FAQ ekle; CTA_BANNER veya CONTACT_FORM ile bitir.'
          : 'Kurumsal sayfa akisi: HERO ile basla, 4-7 blok kullan, FAQ ekle (GEO/SEO icin), CTA_BANNER veya CONTACT_FORM ile bitir.';
    const system = [
      "Kurumsal bir siber guvenlik sirketi (Kron Technologies benzeri) CMS'i icin icerik tasarlayan bir mimar asistansin.",
      `Icerik dili: ${lang}. Hedef icerik tipi: ${typeLabel}.`,
      BLOCK_CATALOG,
      'YANIT KURALI: YALNIZ gecerli JSON dondur (markdown cit yok, aciklama yok):',
      '{ "title": "...", "excerpt": "...", "seo": { "metaTitle": "...", "metaDescription": "50-160 karakter" }, "blocks": [{ "type": "...", "data": { ... } }] }',
      flow +
        ' Linkler /' +
        localeCode +
        '/contact gibi yerel yollara isaret etsin.',
    ].join('\n\n');

    // Opus 4.8 ADAPTIVE thinking ister (eski thinking.enabled/budget_tokens -> 400).
    // callClaudeJson think:true ile adaptive + output_config.effort kullanir; basarisizsa
    // null doner ve cagiran (architect) sablon moduna zarifce duser (400 atmaz).
    const parsed = await this.callClaudeJson<DraftPage>(
      apiKey,
      system,
      prompt,
      {
        maxTokens: 16000,
        think: true,
      },
    );
    if (parsed && parsed.title && Array.isArray(parsed.blocks)) return parsed;
    return null;
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
    proposed: {
      metaTitle: string;
      metaDescription: string;
      ogTitle: string;
      ogDescription: string;
    };
  }> {
    const rawEntry = await this.content.findOne(id);
    const entry = rawEntry as unknown as EntryWithBlocksAndSeo;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseProposed = this.deriveSeo(entry);

    if (apiKey) {
      const isTr = entry.localeCode === 'tr';
      const system = [
        'Kurumsal siber guvenlik web sitesi icin SEO ve GEO uzmanisin.',
        `Hedef dil: ${isTr ? 'Turkce' : 'Ingilizce'}. Marka: Kron Technologies.`,
        'Verilen sayfayi analiz et: (1) bu icerige OZGU somut SEO/erisilebilirlik/GEO onerileri uret, (2) optimize edilmis meta alanlari ONER.',
        'metaTitle <= 60 karakter; metaDescription 120-155 karakter, anahtar kelime dogal, tiklama-dostu.',
        'ogTitle/ogDescription sosyal paylasim icin cekici olmali (meta ile ayni olabilir).',
        'Onerileri ve meta degerlerini HEDEF DILDE yaz.',
        'YALNIZ gecerli JSON dondur (markdown citi yok, aciklama yok):',
        '{ "suggestions": [{ "severity": "info|warning|error", "message": "", "recommendation": "" }], "proposed": { "metaTitle": "", "metaDescription": "", "ogTitle": "", "ogDescription": "" } }',
      ].join('\n\n');
      const userContent = JSON.stringify(
        {
          title: entry.title,
          excerpt: entry.excerpt,
          type: entry.type,
          locale: entry.localeCode,
          currentSeo: entry.seo,
          blocks: entry.blocks.map((b) => ({ type: b.type, data: b.data })),
        },
        null,
        2,
      );
      const ai = await this.callClaudeJson<{
        suggestions: Array<{
          severity: 'info' | 'warning' | 'error';
          message: string;
          recommendation: string;
        }>;
        proposed: Partial<{
          metaTitle: string;
          metaDescription: string;
          ogTitle: string;
          ogDescription: string;
        }>;
      }>(apiKey, system, userContent, { maxTokens: 4000 });
      if (ai && Array.isArray(ai.suggestions)) {
        return {
          suggestions: ai.suggestions,
          proposed: {
            metaTitle: ai.proposed?.metaTitle?.trim() || baseProposed.metaTitle,
            metaDescription:
              ai.proposed?.metaDescription?.trim() ||
              baseProposed.metaDescription,
            ogTitle: ai.proposed?.ogTitle?.trim() || baseProposed.ogTitle,
            ogDescription:
              ai.proposed?.ogDescription?.trim() || baseProposed.ogDescription,
          },
        };
      }
      // Claude basarisiz -> deterministik onerilere + turetilmis meta'ya dus
    }

    return {
      suggestions: this.deterministicSeoAdvice(entry),
      proposed: baseProposed,
    };
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
      // Anahtarsiz mod: "(EN)" eklemez — terim sozlugu + birebir kopya taslagi.
      translated = {
        title: this.glossaryTranslate(original.title, targetLocale),
        excerpt: original.excerpt
          ? this.glossaryTranslate(original.excerpt, targetLocale)
          : null,
        seo: original.seo
          ? {
              metaTitle: original.seo.metaTitle
                ? this.glossaryTranslate(original.seo.metaTitle, targetLocale)
                : undefined,
              metaDescription: original.seo.metaDescription
                ? this.glossaryTranslate(
                    original.seo.metaDescription,
                    targetLocale,
                  )
                : undefined,
              canonicalUrl: original.seo.canonicalUrl ?? undefined,
              robotsIndex: original.seo.robotsIndex,
              robotsFollow: original.seo.robotsFollow,
              ogTitle: original.seo.ogTitle
                ? this.glossaryTranslate(original.seo.ogTitle, targetLocale)
                : undefined,
              ogDescription: original.seo.ogDescription
                ? this.glossaryTranslate(
                    original.seo.ogDescription,
                    targetLocale,
                  )
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
    const targetLang = targetLocale === 'tr' ? 'Turkce' : 'Ingilizce';
    const sourceLang = targetLocale === 'tr' ? 'Ingilizce' : 'Turkce';

    const system = [
      "Kurumsal bir siber guvenlik sirketi CMS'i icin ceviri asistanisin.",
      `Kaynak dil: ${sourceLang}, Hedef dil: ${targetLang}.`,
      'Sana verilen JSON icerigindeki tum kullaniciya acik metinleri (basliklar, aciklamalar, buton metinleri, meta alanlari) hedef dile cevir.',
      "YAPI KURALI: JSON yapisini, anahtarlarini (keys), id'leri, URL'leri, gorsel yollarini ve tip alanlarini (type, order) KESINLIKLE degistirme. Yalnizca metin iceriklerini cevir.",
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
      blocks: original.blocks.map((b) => ({ type: b.type, data: b.data })),
    };

    const parsed = await this.callClaudeJson<TranslatedData>(
      apiKey,
      system,
      JSON.stringify(inputData, null, 2),
      { maxTokens: 16000 },
    );
    if (parsed && parsed.title && Array.isArray(parsed.blocks)) {
      return parsed;
    }
    // Claude basarisiz/gecersiz -> 400 atma; sozluk + birebir kopya taslagina dus.
    this.logger.warn(
      'AI ceviri ciktisi gecersiz — sozluk fallback taslagi kullanildi.',
    );
    return {
      title: this.glossaryTranslate(original.title, targetLocale),
      excerpt: original.excerpt
        ? this.glossaryTranslate(original.excerpt, targetLocale)
        : null,
      seo: original.seo
        ? {
            metaTitle: original.seo.metaTitle
              ? this.glossaryTranslate(original.seo.metaTitle, targetLocale)
              : undefined,
            metaDescription: original.seo.metaDescription
              ? this.glossaryTranslate(
                  original.seo.metaDescription,
                  targetLocale,
                )
              : undefined,
            canonicalUrl: original.seo.canonicalUrl ?? undefined,
            robotsIndex: original.seo.robotsIndex,
            robotsFollow: original.seo.robotsFollow,
            ogTitle: original.seo.ogTitle
              ? this.glossaryTranslate(original.seo.ogTitle, targetLocale)
              : undefined,
            ogDescription: original.seo.ogDescription
              ? this.glossaryTranslate(original.seo.ogDescription, targetLocale)
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

  private translateValue(val: unknown, target: string): unknown {
    if (typeof val === 'string') {
      return this.glossaryTranslate(val, target);
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
    metrics: {
      words: number;
      sentences: number;
      avgSentence: number;
      paragraphs: number;
    };
  }> {
    const rawEntry = await this.content.findOne(id);
    const entry = rawEntry as unknown as EntryWithBlocksAndSeo;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const m = this.textMetrics(this.collectText(entry));
    const metrics = {
      words: m.words,
      sentences: m.sentences,
      avgSentence: Math.round(m.avgSentence * 10) / 10,
      paragraphs: m.paragraphs,
    };

    if (apiKey) {
      const isTr = entry.localeCode === 'tr';
      const system = [
        'Kurumsal siber guvenlik web sitesi icin editoryal analiz uzmanisin.',
        `Hedef dil: ${isTr ? 'Turkce' : 'Ingilizce'}.`,
        'Sana sayfanin metin metrikleri ve icerigi verilir; editoryal ton, okunabilirlik ve cumle yapisini degerlendir.',
        'readabilityScore: 0-100 (yuksek = daha kolay okunur).',
        "tone: kisa ozet ifade (orn. 'Profesyonel ve guven odakli').",
        'suggestions: bu icerige OZGU, somut 3-5 editoryal tavsiye. Genel klise YAZMA; gercek cumlelere/bloklara/uzun paragraflara atifta bulun.',
        'YALNIZ gecerli JSON dondur (markdown citi yok, aciklama yok):',
        '{ "readabilityScore": 0, "tone": "", "suggestions": ["", ""] }',
      ].join('\n\n');
      const userContent = JSON.stringify(
        {
          metrics,
          title: entry.title,
          excerpt: entry.excerpt,
          locale: entry.localeCode,
          blocks: entry.blocks.map((b) => ({ type: b.type, data: b.data })),
        },
        null,
        2,
      );
      const ai = await this.callClaudeJson<{
        readabilityScore: number;
        tone: string;
        suggestions: string[];
      }>(apiKey, system, userContent, { maxTokens: 4000 });
      if (ai && Array.isArray(ai.suggestions) && ai.suggestions.length > 0) {
        return {
          readabilityScore: Math.max(0, Math.min(100, ai.readabilityScore)),
          tone: ai.tone,
          suggestions: ai.suggestions,
          metrics,
        };
      }
      // Claude basarisiz/bos -> deterministik analize dus (asla bos donme)
    }

    return { ...this.deterministicReadability(entry, m), metrics };
  }

  // Deterministik okunabilirlik: gercek metriklerden (cumle/kelime/paragraf) skor + ozgun tavsiye.
  private deterministicReadability(
    entry: EntryWithBlocksAndSeo,
    m: {
      words: number;
      sentences: number;
      avgSentence: number;
      paragraphs: number;
      longParagraphs: number;
    },
  ): { readabilityScore: number; tone: string; suggestions: string[] } {
    const isTr = entry.localeCode === 'tr';
    // Ideal ~14-18 kelime/cumle; uzun cumle ve uzun paragraf okunabilirligi dusurur.
    let score = 100;
    if (m.avgSentence > 18) score -= Math.min(35, (m.avgSentence - 18) * 2.5);
    if (m.longParagraphs > 0) score -= Math.min(20, m.longParagraphs * 8);
    if (m.words > 0 && m.words < 40) score -= 10; // cok kisa = zayif icerik
    score = Math.max(20, Math.min(100, Math.round(score)));

    const tone = isTr
      ? 'Profesyonel ve kurumsal'
      : 'Professional and corporate';
    const s: string[] = [];
    if (m.avgSentence > 18) {
      s.push(
        isTr
          ? `Ortalama cumle uzunlugu ${Math.round(m.avgSentence)} kelime — 14-18 araligina indirmek icin uzun cumleleri bolun.`
          : `Average sentence length is ${Math.round(m.avgSentence)} words — split long sentences toward the 14-18 range.`,
      );
    }
    if (m.longParagraphs > 0) {
      s.push(
        isTr
          ? `${m.longParagraphs} adet uzun blok metni (40+ kelime) var — alt baslik veya madde imleriyle bolun.`
          : `${m.longParagraphs} long text block(s) (40+ words) — break them with subheadings or bullets.`,
      );
    }
    s.push(
      isTr
        ? 'Teknik terimlerin (PAM, zero-trust, MFA) ilk gecisinde kisa bir parantez-aciklama ekleyin (GEO/LLM uyumu).'
        : 'Add a short parenthetical gloss on first use of technical terms (PAM, zero-trust, MFA) for GEO/LLM compatibility.',
    );
    if (m.sentences > 0 && score >= 80) {
      s.push(
        isTr
          ? 'Metin akiskan; bold vurgu ve madde imleriyle taranabilirligi biraz daha artirabilirsiniz.'
          : 'Text reads well; bold highlights and bullets can further improve scannability.',
      );
    }
    return { readabilityScore: score, tone, suggestions: s };
  }

  // ===================== Ortak yardimcilar =====================

  // Sayfadaki tum kullaniciya acik metinleri toplar (skor/ozet/SEO turetme icin).
  private collectText(entry: EntryWithBlocksAndSeo): string {
    const parts: string[] = [entry.title, entry.excerpt ?? ''];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') {
        const s = v.trim();
        if (
          s &&
          !s.startsWith('/') &&
          !s.startsWith('http') &&
          !/^[a-z0-9_-]+$/.test(s)
        ) {
          parts.push(s.replace(/<[^>]+>/g, ' ')); // html etiketlerini soy
        }
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object')
        Object.values(v as Record<string, unknown>).forEach(walk);
    };
    entry.blocks.forEach((b) => walk(b.data));
    return parts.filter(Boolean).join('. ');
  }

  private textMetrics(text: string): {
    words: number;
    sentences: number;
    avgSentence: number;
    paragraphs: number;
    longParagraphs: number;
  } {
    const clean = text.replace(/\s+/g, ' ').trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    const sentenceArr = clean
      .split(/[.!?]+/)
      .map((x) => x.trim())
      .filter((x) => x.split(/\s+/).filter(Boolean).length > 1);
    const sentences = Math.max(1, sentenceArr.length);
    const avgSentence = words / sentences;
    const longParagraphs = sentenceArr.filter(
      (x) => x.split(/\s+/).length > 40,
    ).length;
    return {
      words,
      sentences,
      avgSentence,
      paragraphs: sentenceArr.length,
      longParagraphs,
    };
  }

  // ```json ... ``` citlerini ayiklar, ilk { ile son } arasini JSON.parse eder.
  private extractJson<T>(text: string): T | null {
    if (!text) return null;
    let s = text.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(s.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }

  // Saglam Claude JSON cagrisi: thinking varsayilan KAPALI (yapisal gorevde token bogmaz),
  // citler ayiklanir, hata loglanir, basarisizsa null doner (cagiran deterministik fallback'e duser).
  private async callClaudeJson<T>(
    apiKey: string,
    system: string,
    userContent: string,
    opts: { maxTokens?: number; think?: boolean } = {},
  ): Promise<T | null> {
    const client = new Anthropic({ apiKey });
    try {
      const response = await client.messages.create({
        model: process.env.AI_MODEL ?? 'claude-opus-4-8',
        max_tokens: opts.maxTokens ?? 8000,
        system,
        messages: [{ role: 'user', content: userContent }],
        ...(opts.think
          ? {
              // Opus 4.8: adaptive thinking (eski enabled/budget_tokens desteklenmiyor).
              thinking: { type: 'adaptive' as const },
              output_config: { effort: 'high' as const },
            }
          : {}),
      });
      const text = response.content
        .filter((b): b is TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      const parsed = this.extractJson<T>(text);
      if (parsed === null) {
        this.logger.warn(
          `Claude JSON parse edilemedi (ilk 160: ${text.slice(0, 160)})`,
        );
      }
      return parsed;
    } catch (err: unknown) {
      this.logger.error(
        `Claude cagrisi hatasi: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  // Icerikten deterministik meta degerleri turetir (AI bos birakirsa veya anahtar yoksa).
  private deriveSeo(entry: EntryWithBlocksAndSeo): {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
  } {
    const brand = 'Kron Technologies';
    const title = entry.title.trim();
    const metaTitle = (title.length > 50 ? title : `${title} | ${brand}`).slice(
      0,
      60,
    );
    const raw = (
      entry.excerpt?.trim() ||
      this.firstBodyText(entry) ||
      title
    ).replace(/\s+/g, ' ');
    const metaDescription =
      raw.length > 155 ? `${raw.slice(0, 152).trimEnd()}...` : raw;
    return {
      metaTitle,
      metaDescription,
      ogTitle: title,
      ogDescription: metaDescription,
    };
  }

  private firstBodyText(entry: EntryWithBlocksAndSeo): string {
    for (const b of entry.blocks) {
      const d = b.data;
      const cand = (d.body ?? d.subtitle ?? d.intro ?? d.html) as
        | string
        | undefined;
      if (typeof cand === 'string' && cand.trim())
        return cand.replace(/<[^>]+>/g, ' ').trim();
    }
    return '';
  }

  private deterministicSeoAdvice(entry: EntryWithBlocksAndSeo): Array<{
    severity: 'info' | 'warning' | 'error';
    message: string;
    recommendation: string;
  }> {
    const isTr = entry.localeCode === 'tr';
    const out: Array<{
      severity: 'info' | 'warning' | 'error';
      message: string;
      recommendation: string;
    }> = [];
    const seo = entry.seo;
    if (!seo?.metaDescription || seo.metaDescription.length < 80) {
      out.push({
        severity: 'warning',
        message: isTr
          ? 'Meta aciklama eksik veya cok kisa.'
          : 'Meta description missing or too short.',
        recommendation: isTr
          ? 'Asagidaki onerilen meta aciklamayi uygulayin (120-155 karakter).'
          : 'Apply the proposed meta description below (120-155 chars).',
      });
    }
    if (!seo?.ogTitle || !seo?.ogDescription) {
      out.push({
        severity: 'info',
        message: isTr
          ? 'Open Graph alanlari bos.'
          : 'Open Graph fields are empty.',
        recommendation: isTr
          ? 'Sosyal paylasim gorunumu icin OG Title/Description doldurun (asagidaki oneri).'
          : 'Fill OG Title/Description for social sharing (proposal below).',
      });
    }
    if (!entry.blocks.some((b) => b.type === 'FAQ')) {
      out.push({
        severity: 'info',
        message: isTr ? 'FAQ blogu yok (GEO).' : 'No FAQ block (GEO).',
        recommendation: isTr
          ? 'LLM tabanli aramalar icin bir FAQ blogu ekleyin (FAQPage schema cikar).'
          : 'Add a FAQ block for LLM-based search (emits FAQPage schema).',
      });
    }
    return out;
  }

  // Anahtarsiz ceviri modu: kucuk terim sozlugu + BIREBIR KOPYA (asla "(EN)" eklemez).
  private glossaryTranslate(text: string, target: string): string {
    const s = text;
    if (!s.trim() || s.startsWith('/') || s.startsWith('http')) return s;
    const trEn: Record<string, string> = {
      Ürünler: 'Products',
      Çözümler: 'Solutions',
      Kaynaklar: 'Resources',
      İletişim: 'Contact',
      Hakkımızda: 'About Us',
      'Daha Fazla': 'Learn More',
      'Demo Talep Et': 'Request a Demo',
      'Bize Ulaşın': 'Contact Us',
      Özellikler: 'Features',
      'Öne Çıkanlar': 'Highlights',
      'Neden Kron?': 'Why Kron?',
      'Sıkça Sorulan Sorular': 'Frequently Asked Questions',
    };
    const map =
      target === 'en'
        ? trEn
        : Object.fromEntries(Object.entries(trEn).map(([k, v]) => [v, k]));
    let out = s;
    for (const [from, to] of Object.entries(map)) {
      out = out.replace(
        new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        to,
      );
    }
    return out; // sozlukte yoksa birebir kopya (taslak; el ile cevrilir)
  }
}
