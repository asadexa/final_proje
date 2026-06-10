import Anthropic from '@anthropic-ai/sdk';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { validateBlockData, type BlockType } from '@kron/shared';
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
      note = 'ANTHROPIC_API_KEY tanimli degil — deterministik sablon modu kullanildi.';
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
      throw new BadRequestException('Uretilen hicbir blok sema dogrulamasini gecemedi.');
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
        blocks: validBlocks.map((b, i) => ({ type: b.type as BlockType, order: i, data: b.data })),
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
      'Kurumsal bir siber guvenlik sirketi (Kron Technologies benzeri) CMS\'i icin sayfa tasarlayan bir mimar asistansin.',
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
        thinking: { type: 'adaptive' },
        system,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return this.parseDraft(text);
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        this.logger.error(`Claude API hatasi ${e.status}: ${e.message}`);
        throw new BadRequestException(`AI uretimi basarisiz (API ${e.status}). Sablon modu icin key'i kaldirin.`);
      }
      throw e;
    }
  }

  private parseDraft(text: string): DraftPage {
    // Olasi markdown citlerini temizle, ilk { ... son } arasini al
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new BadRequestException('AI ciktisi JSON degil.');
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
      excerpt: tr ? `${title} hakkinda bilgi sayfasi.` : `Information page about ${title}.`,
      seo: {
        metaTitle: title,
        metaDescription: tr
          ? `${title} — ozellikler, faydalar ve sik sorulan sorular. Demo icin bize ulasin.`
          : `${title} — features, benefits and FAQ. Contact us for a demo.`,
      },
      blocks: [
        { type: 'HERO', data: { title, subtitle: tr ? 'Bu taslak AI Mimar sablonundan uretildi — editorde duzenleyin.' : 'Draft generated by the Architect template — edit in the editor.', cta: { label: tr ? 'Demo Talep Et' : 'Request a Demo', href: contact } } },
        { type: 'FEATURE_GRID', data: { title: tr ? 'One Cikan Ozellikler' : 'Key Features', items: [
          { title: tr ? 'Ozellik 1' : 'Feature 1', description: tr ? 'Aciklamayi duzenleyin.' : 'Edit this description.' },
          { title: tr ? 'Ozellik 2' : 'Feature 2', description: tr ? 'Aciklamayi duzenleyin.' : 'Edit this description.' },
          { title: tr ? 'Ozellik 3' : 'Feature 3', description: tr ? 'Aciklamayi duzenleyin.' : 'Edit this description.' },
        ] } },
        { type: 'FAQ', data: { title: tr ? 'Sik Sorulan Sorular' : 'Frequently Asked Questions', items: [
          { question: tr ? `${title} nedir?` : `What is ${title}?`, answer: tr ? 'Cevabi duzenleyin.' : 'Edit this answer.' },
          { question: tr ? 'Nasil baslarim?' : 'How do I get started?', answer: tr ? 'Cevabi duzenleyin.' : 'Edit this answer.' },
        ] } },
        { type: 'CTA_BANNER', data: { title: tr ? `${title} ile tanisin` : `See ${title} in action`, cta: { label: tr ? 'Demo Talep Et' : 'Request a Demo', href: contact } } },
      ],
    };
  }

  // --------------------------- yardimcilar ---------------------------

  private slugify(s: string): string {
    const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
    return s
      .split('')
      .map((ch) => map[ch] ?? ch)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'yeni-sayfa';
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
}
