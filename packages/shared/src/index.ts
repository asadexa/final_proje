import { z } from 'zod';

/**
 * Paylasilan sozlesme (FE + BE tek kaynak).
 * Enum'lar Prisma sema enum'lari ile ESLESMELI (degisirse ikisi birden guncellenir).
 */

// ----------------------------- Enum'lar -----------------------------
export const LOCALES = ['tr', 'en'] as const;
export type LocaleCode = (typeof LOCALES)[number];

export const ROLES = ['ADMIN', 'EDITOR'] as const;
export type Role = (typeof ROLES)[number];

export const ENTRY_TYPES = ['PAGE', 'PRODUCT', 'POST'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const BLOCK_TYPES = [
  'HERO',
  'SECTION_HEADING',
  'FEATURE_GRID',
  'PRODUCT_SHOWCASE',
  'VALUE_PROP',
  'STATS',
  'CASE_STUDY',
  'BLOG_CAROUSEL',
  'RICH_TEXT',
  'MEDIA_TEXT',
  'LOGO_CLOUD',
  'CTA_BANNER',
  'CONTACT_FORM',
  'FAQ',
  'PRODUCT_TABS',
  'TESTIMONIAL',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

// --------------------------- Ortak parcalar ---------------------------
const linkSchema = z.object({ label: z.string(), href: z.string() });
const imageRefSchema = z.object({
  mediaId: z.string().optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
});

// ------------------------- Blok data semalari -------------------------
// Her BlockType icin bir sema. `satisfies` ile EKSIK birakilamaz (yeni tip => yeni sema zorunlu).
export const blockSchemas = {
  HERO: z.object({
    eyebrow: z.string().optional(),
    title: z.string(),
    subtitle: z.string().optional(),
    cta: linkSchema.optional(),
    image: imageRefSchema.optional(),
    // Urun sayfasi banner'i (krontech .product-banner): bg gorseli (image),
    // lead (subtitle) + birden fazla outline buton. variant='product' ile secilir.
    variant: z.enum(['product']).optional(),
    buttons: z.array(linkSchema).optional(),
    // Cok-slide hero (krontech main-slider). Doluysa carousel render edilir,
    // bossa tekli hero. Migration gerekmez: ayni HERO tipinin data'si genisliyor.
    slides: z
      .array(
        z.object({
          eyebrow: z.string().optional(),
          title: z.string(), // <b>...</b> => mavi vurgu (krontech .bgblueb b)
          subtitle: z.string().optional(),
          cta: linkSchema.optional(),
          image: imageRefSchema.optional(), // slide arka plani
          graphic: imageRefSchema.optional(), // sag taraf seffaf urun cemberi (krontech)
        }),
      )
      .optional(),
  }),
  SECTION_HEADING: z.object({
    title: z.string(),
    intro: z.string().optional(),
    align: z.enum(['left', 'center']).default('left'),
  }),
  FEATURE_GRID: z.object({
    title: z.string().optional(),
    items: z.array(
      z.object({
        icon: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        link: linkSchema.optional(),
      }),
    ),
  }),
  PRODUCT_SHOWCASE: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    moreLabel: z.string().optional(), // kart CTA metni ("Learn More" / "Daha Fazla") — icerik, kodda degil
    products: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        href: z.string().optional(),
        features: z.array(z.string()).optional(),
        image: imageRefSchema.optional(),
      }),
    ),
  }),
  // VALUE_PROP ("Why Kron?"): solda metin + buton, sagda gorsel (iki kolon).
  VALUE_PROP: z.object({
    title: z.string(), // <b>...</b> => mavi vurgu
    body: z.string(),
    cta: linkSchema.optional(),
    image: imageRefSchema.optional(),
  }),
  STATS: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    items: z.array(
      z.object({ value: z.string(), label: z.string(), icon: imageRefSchema.optional() }),
    ),
  }),
  CASE_STUDY: z.object({
    title: z.string(),
    excerpt: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: linkSchema.optional(),
  }),
  BLOG_CAROUSEL: z.object({
    title: z.string().optional(),
    limit: z.number().int().positive().max(24).default(6),
  }),
  RICH_TEXT: z.object({ html: z.string() }),
  MEDIA_TEXT: z.object({
    title: z.string().optional(),
    body: z.string(),
    image: imageRefSchema,
    imageSide: z.enum(['left', 'right']).default('left'),
    cta: linkSchema.optional(), // outline buton (krontech Sekerbank video bolumu)
  }),
  LOGO_CLOUD: z.object({ title: z.string().optional(), logos: z.array(imageRefSchema) }),
  CTA_BANNER: z.object({ title: z.string(), cta: linkSchema }),
  CONTACT_FORM: z.object({
    title: z.string().optional(),
    formKey: z.string(),
    consentText: z.string().optional(),
  }),
  FAQ: z.object({
    title: z.string().optional(),
    items: z.array(z.object({ question: z.string(), answer: z.string() })),
  }),
  // Urun sayfasi: banner alti breadcrumb + ikonlu sekme cubugu (krontech #nav-tabs-wrapper).
  // Sekmeler gorsel 1:1; alt sayfalar kapsam disi -> href'i olmayan sekme tiklanamaz (bilincli sapma).
  PRODUCT_TABS: z.object({
    breadcrumb: z.array(z.string()).optional(),
    tabs: z.array(
      z.object({
        label: z.string(),
        href: z.string().optional(),
        icon: z.string().optional(), // /kron/products/tabs/*.png
        active: z.boolean().optional(),
      }),
    ),
  }),
  // Musteri referans slider'i (krontech .blue-bg-slider, mavi gradyan zemin).
  TESTIMONIAL: z.object({
    items: z.array(
      z.object({
        title: z.string(), // <b>...</b> => beyaz kutu vurgu (krontech .bgwhiteb b)
        quote: z.string(),
        author: z.string().optional(),
        image: imageRefSchema.optional(),
        logo: imageRefSchema.optional(), // musteri logosu (krontech .slider-logo, max 160x60)
      }),
    ),
  }),
} satisfies Record<BlockType, z.ZodType>;

// Her blok tipinin data tipi (z.infer ile otomatik)
export type BlockDataMap = { [K in BlockType]: z.infer<(typeof blockSchemas)[K]> };

export interface BlockInput<T extends BlockType = BlockType> {
  type: T;
  order: number;
  enabled?: boolean;
  data: BlockDataMap[T];
}

export type BlockValidationResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

// type'a gore data dogrulama (BE create/update + FE guven)
export function validateBlockData(type: BlockType, data: unknown): BlockValidationResult {
  const schema: z.ZodType | undefined = blockSchemas[type];
  if (!schema) return { success: false, error: `Bilinmeyen blok tipi: ${type}` };
  const parsed = schema.safeParse(data);
  if (parsed.success) return { success: true, data: parsed.data };
  const error = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  return { success: false, error };
}

export function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}
