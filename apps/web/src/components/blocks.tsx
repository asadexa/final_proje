import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { listEntries } from "@/lib/api";
import type { BlockNode } from "@/lib/types";
import { BlogCarouselClient } from "./blog-carousel";
import { HeroCarousel } from "./hero-carousel";
import { HeroSlide, type HeroSlideData } from "./hero-slide";
import { ProductCarousel } from "./product-carousel";

type ImageData = { url?: string; alt?: string };

// --- guvenli okuyucular (no any) ---
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
type Cta = { label?: string; href?: string };

function Container({
  children,
  className = "",
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  // krontech: .container = 1140px, .extended-container = 1200px
  return (
    <div className={`mx-auto ${wide ? "max-w-[1200px]" : "max-w-[1140px]"} px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

type BlockProps = { data: Record<string, unknown> };

function Hero({ data }: BlockProps): ReactElement {
  // Slides doluysa krontech main-slider gibi carousel; bossa tekli hero.
  const slides = arr<HeroSlideData>(data.slides);
  if (slides.length > 0) return <HeroCarousel slides={slides} />;

  // Tekli hero (urun/blog sayfa basligi) — ayni tipografiyi paylasir.
  const single: HeroSlideData = {
    eyebrow: str(data.eyebrow) || undefined,
    title: str(data.title),
    subtitle: str(data.subtitle) || undefined,
    cta: data.cta as Cta | undefined,
    image: data.image as { url?: string } | undefined,
  };
  return (
    <section
      className="relative bg-[#0a1733] bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/hero-bg.png')" }}
    >
      <HeroSlide slide={single} />
    </section>
  );
}

function SectionHeading({ data }: BlockProps): ReactElement {
  const center = data.align === "center";
  return (
    <section className="bg-surface">
      <Container className={`py-10 ${center ? "text-center" : ""}`}>
        <h2 className="text-2xl font-bold text-dark">{str(data.title)}</h2>
        {str(data.intro) && <p className="mt-3 max-w-2xl text-ink-soft">{str(data.intro)}</p>}
      </Container>
    </section>
  );
}

// "Kron in Numbers" — her blokta ikon gorseli + buyuk sayi + etiket (krontech numbers).
function Stats({ data }: BlockProps): ReactElement {
  const items = arr<{ value?: string; label?: string; icon?: ImageData }>(data.items);
  return (
    <section className="bg-surface">
      <Container className="py-16 text-center">
        {str(data.title) && (
          <h2 className="text-[2rem] font-light text-dark md:text-[2.5rem]">{str(data.title)}</h2>
        )}
        {str(data.subtitle) && (
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">{str(data.subtitle)}</p>
        )}
        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-y-10 md:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="px-4">
              {it.icon?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.icon.url}
                  alt={it.icon.alt ?? it.label ?? ""}
                  className="mx-auto mb-4 h-20 w-auto object-contain"
                />
              )}
              <div className="text-[2.5rem] font-bold leading-none text-dark">{it.value}</div>
              <div className="mt-2 text-sm text-ink-soft">{it.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FeatureGrid({ data }: BlockProps): ReactElement {
  const items = arr<{ title?: string; description?: string }>(data.items);
  return (
    <section className="bg-surface-muted">
      <Container className="py-16">
        {str(data.title) && <h2 className="mb-10 text-2xl font-bold text-dark">{str(data.title)}</h2>}
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <div
              key={i}
              className="rounded-lg border border-line bg-surface p-6 transition hover:border-primary hover:shadow-sm"
            >
              <h3 className="text-lg font-semibold text-dark">{it.title}</h3>
              {it.description && <p className="mt-2 text-sm text-ink-soft">{it.description}</p>}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Faq({ data }: BlockProps): ReactElement {
  const items = arr<{ question?: string; answer?: string }>(data.items);
  return (
    <section className="bg-surface">
      <Container className="py-16">
        {str(data.title) && <h2 className="mb-8 text-2xl font-bold text-dark">{str(data.title)}</h2>}
        <div className="divide-y divide-line border-y border-line">
          {items.map((it, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-dark">
                {it.question}
              </summary>
              <p className="mt-3 text-sm text-ink-soft">{it.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

function RichText({ data }: BlockProps): ReactElement {
  return (
    <section className="bg-surface">
      <Container className="py-12">
        <div
          className="mx-auto max-w-3xl text-base leading-7 text-ink [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-soft [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-dark [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-dark [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: str(data.html) }}
        />
      </Container>
    </section>
  );
}

// "Kron Products" — ortali baslik + altyazi, ardindan productslider (gorselli kartlar).
function ProductShowcase({ data }: BlockProps): ReactElement {
  const products = arr<{
    name: string;
    description?: string;
    href?: string;
    features?: string[];
    image?: ImageData;
  }>(data.products);
  return (
    <section className="bg-surface">
      <Container wide className="py-16">
        {str(data.title) && (
          <h2 className="text-center text-[2rem] font-light leading-tight text-dark md:text-[2.5rem]">
            {str(data.title)}
          </h2>
        )}
        {str(data.subtitle) && (
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-soft">{str(data.subtitle)}</p>
        )}
        <div className="mt-12">
          <ProductCarousel products={products} moreLabel={str(data.moreLabel) || undefined} />
        </div>
      </Container>
    </section>
  );
}

// "Why Kron?" — iki kolon: solda baslik (mavi vurgu) + lead + outline buton, sagda gorsel.
function ValueProp({ data }: BlockProps): ReactElement {
  const cta = data.cta as Cta | undefined;
  const img = data.image as ImageData | undefined;
  return (
    <section className="bg-surface">
      <Container wide className="py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2
              className="text-[2rem] font-light leading-tight text-dark md:text-[2.75rem] [&_b]:font-light [&_b]:text-primary"
              dangerouslySetInnerHTML={{ __html: str(data.title) }}
            />
            {str(data.body) && (
              <p className="mt-6 max-w-xl text-[1.25rem] leading-8 text-ink-soft">{str(data.body)}</p>
            )}
            {cta?.href && (
              <Link
                href={cta.href}
                className="mt-8 inline-block rounded-none border-2 border-primary px-[40px] py-3 text-[16px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {cta.label ?? ""}
              </Link>
            )}
          </div>
          <div>
            {img?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.alt ?? ""} className="w-full" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-lg bg-surface-muted" />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

// Banka basari hikayesi — sol bgblueb 28px baslik (mavi vurgu) + ozet + CTA, sag gorsel.
function CaseStudy({ data }: BlockProps): ReactElement {
  const cta = data.cta as Cta | undefined;
  const img = data.image as ImageData | undefined;
  return (
    <section className="bg-surface-muted">
      <Container wide className="py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <h2
              className="text-[28px] font-bold leading-snug text-dark [&_b]:bg-primary [&_b]:px-[3px] [&_b]:text-white"
              dangerouslySetInnerHTML={{ __html: str(data.title) }}
            />
            {str(data.excerpt) && <p className="mt-4 text-ink-soft">{str(data.excerpt)}</p>}
            {cta?.href && (
              <Link
                href={cta.href}
                className="mt-6 inline-block rounded-none bg-primary px-[40px] py-3 text-[16px] font-medium text-white transition-colors hover:bg-primary-600"
              >
                {cta.label ?? ""}
              </Link>
            )}
          </div>
          <div className="order-1 md:order-2">
            {img?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.alt ?? ""} className="w-full" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-primary/20 to-dark/10" />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

// BLOG_CAROUSEL: son yazilari API'den ceker (locale gerektirir) -> istemci carousel.
async function BlogCarousel({
  data,
  locale,
}: {
  data: Record<string, unknown>;
  locale: string;
}): Promise<ReactElement | null> {
  const limit = num(data.limit) || 6;
  const list = await listEntries(locale, "POST", 1);
  // Tarih server'da locale'e gore formatlanir (hidrasyon uyumu icin string gecilir).
  const fmt = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" });
  const posts = (list?.items ?? []).slice(0, limit).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? null,
    image: p.coverImage?.url ?? null,
    date: p.publishedAt ? fmt.format(new Date(p.publishedAt)) : null,
  }));
  if (posts.length === 0) return null;
  return <BlogCarouselClient title={str(data.title)} posts={posts} locale={locale} />;
}

// CTA bandi — koyu zemin, baslik + buton (urun sayfasi kapanisi vb.).
function CtaBanner({ data }: BlockProps): ReactElement {
  const cta = data.cta as Cta | undefined;
  return (
    <section className="bg-dark text-white">
      <Container className="flex flex-col items-center gap-6 py-14 text-center md:flex-row md:justify-between md:text-left">
        <h2 className="text-2xl font-light md:text-[1.75rem]">{str(data.title)}</h2>
        {cta?.href && (
          <Link
            href={cta.href}
            className="inline-block shrink-0 rounded-none bg-primary px-[40px] py-3 text-[16px] font-medium text-white transition-colors hover:bg-primary-600"
          >
            {cta.label ?? ""}
          </Link>
        )}
      </Container>
    </section>
  );
}

// Registry: yeni blok tipi = buraya bir bilesen ekle (modulerlik).
const REGISTRY: Record<string, (props: BlockProps) => ReactElement> = {
  HERO: Hero,
  SECTION_HEADING: SectionHeading,
  STATS: Stats,
  FEATURE_GRID: FeatureGrid,
  PRODUCT_SHOWCASE: ProductShowcase,
  VALUE_PROP: ValueProp,
  CASE_STUDY: CaseStudy,
  CTA_BANNER: CtaBanner,
  FAQ: Faq,
  RICH_TEXT: RichText,
};

export function Blocks({
  blocks,
  locale,
}: {
  blocks: BlockNode[];
  locale: string;
}): ReactElement {
  return (
    <>
      {blocks.map((b) => {
        // BLOG_CAROUSEL async (yazilari ceker); ayrica ele alinir.
        if (b.type === "BLOG_CAROUSEL") {
          return <BlogCarousel key={b.id} data={b.data} locale={locale} />;
        }
        const Component = REGISTRY[b.type];
        return Component ? <Component key={b.id} data={b.data} /> : null;
      })}
    </>
  );
}
