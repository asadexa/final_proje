import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { listEntries } from "@/lib/api";
import type { BlockNode } from "@/lib/types";
import { BlogCarouselClient } from "./blog-carousel";
import { HeroCarousel } from "./hero-carousel";
import { HeroSlide, type HeroSlideData } from "./hero-slide";

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

function Stats({ data }: BlockProps): ReactElement {
  const items = arr<{ value?: string; label?: string }>(data.items);
  return (
    <section className="bg-surface">
      <Container className="py-16">
        {str(data.title) && (
          <h2 className="mb-10 text-center text-2xl font-bold text-dark">{str(data.title)}</h2>
        )}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-bold text-primary">{it.value}</div>
              <div className="mt-2 text-sm text-muted">{it.label}</div>
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
          className="max-w-3xl text-ink-soft [&_a]:text-primary [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: str(data.html) }}
        />
      </Container>
    </section>
  );
}

function ProductShowcase({ data }: BlockProps): ReactElement {
  const products = arr<{
    name?: string;
    description?: string;
    href?: string;
    features?: string[];
  }>(data.products);
  return (
    <section className="bg-surface">
      <Container className="py-16">
        {str(data.title) && (
          <h2 className="mb-10 text-center text-2xl font-bold text-dark">{str(data.title)}</h2>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => {
            const inner = (
              <>
                <h3 className="text-lg font-semibold text-dark">{p.name}</h3>
                {p.description && <p className="mt-2 text-sm text-ink-soft">{p.description}</p>}
                {arr<string>(p.features).length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {arr<string>(p.features).map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-ink-soft">
                        <span className="mt-0.5 font-bold text-primary">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
            const cls =
              "flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition hover:border-primary hover:shadow-sm";
            return p.href ? (
              <Link key={i} href={p.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={i} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function ValueProp({ data }: BlockProps): ReactElement {
  const cta = data.cta as Cta | undefined;
  return (
    <section className="bg-dark text-white">
      <Container className="py-16 text-center">
        <h2 className="text-2xl font-bold md:text-3xl">{str(data.title)}</h2>
        {str(data.body) && (
          <p className="mx-auto mt-4 max-w-2xl text-white/80">{str(data.body)}</p>
        )}
        {cta?.href && (
          <Link
            href={cta.href}
            className="mt-8 inline-block rounded-none bg-primary px-[50px] py-3 text-[18px] font-normal leading-[34px] text-white transition-colors hover:bg-primary-600"
          >
            {cta.label ?? ""}
          </Link>
        )}
      </Container>
    </section>
  );
}

function CaseStudy({ data }: BlockProps): ReactElement {
  const cta = data.cta as Cta | undefined;
  const img = (data.image as { url?: string } | undefined)?.url;
  return (
    <section className="bg-surface-muted">
      <Container className="py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Case Study</p>
            <h2 className="mt-2 text-2xl font-bold text-dark">{str(data.title)}</h2>
            {str(data.excerpt) && <p className="mt-3 text-ink-soft">{str(data.excerpt)}</p>}
            {cta?.href && (
              <Link
                href={cta.href}
                className="mt-6 inline-block rounded-none bg-primary px-[50px] py-3 text-[18px] font-normal leading-[34px] text-white transition-colors hover:bg-primary-600"
              >
                {cta.label ?? ""}
              </Link>
            )}
          </div>
          <div className="order-1 md:order-2">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="w-full rounded-lg object-cover" />
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
  const posts = (list?.items ?? []).slice(0, limit).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? null,
  }));
  if (posts.length === 0) return null;
  return <BlogCarouselClient title={str(data.title)} posts={posts} locale={locale} />;
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
