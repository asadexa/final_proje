import Image from "next/image";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { HeroCarousel } from "./hero-carousel";
import { HeroSlide, type HeroSlideData } from "./hero-slide";
import { ProductCarousel } from "./product-carousel";
import { TestimonialSlider, type TestimonialItem } from "./testimonial-slider";

// SALT-GORSEL blok bilesenleri + REGISTRY (veri cekmez, server-only API kullanmaz).
// Iki tuketicisi var:
//  1) blocks.tsx (server)  - public sayfa render'i
//  2) admin canli onizleme / surum onizleme (client) - AYNI bilesenler => uretimle birebir
// Veri ceken bloklar (BLOG_CAROUSEL, CONTACT_FORM) burada DEGIL; blocks.tsx ele alir.

type ImageData = { url?: string; alt?: string };

// --- guvenli okuyucular (no any) ---
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
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

export type BlockProps = { data: Record<string, unknown> };

// Urun sayfasi banner'i — krontech .gradient-header/.product-banner OLCUMLE birebir:
// 400px, bg gorseli (cover) + soldan mavi gradyan overlay (270deg, .8),
// h1 40px/700 (.gradient-header h1 display-3'u ezer) + .lead max-w 530px/mb-35
// + beyaz cerceveli 48px outline butonlar (hover: mavi gradyan dolgu).
function ProductBanner({ data }: BlockProps): ReactElement {
  const img = data.image as ImageData | undefined;
  const buttons = arr<Cta>(data.buttons);
  const btn =
    "inline-flex h-12 items-center rounded border border-white px-8 text-[15px] font-normal text-white transition-[background] hover:[background-image:linear-gradient(180deg,#1596ff_0%,#1563ff_100%)]";
  return (
    <section
      className="relative flex min-h-[400px] items-center bg-[#0a1733] bg-cover bg-center text-white"
      style={img?.url ? { backgroundImage: `url('${img.url}')` } : undefined}
    >
      {/* krontech .gradient-header::after — soldan mavi, saga dogru seffaf */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "linear-gradient(270deg, rgba(47,156,255,0) 0%, rgba(21,99,255,0.75) 100%)",
        }}
      />
      <Container className="relative z-[4] w-full py-12">
        <h1
          className="mb-4 text-[32px] font-bold leading-tight md:text-[40px] [&_b]:bg-primary [&_b]:px-[3px] [&_b]:text-white"
          dangerouslySetInnerHTML={{ __html: str(data.title) }}
        />
        {str(data.subtitle) && (
          <p className="mb-[35px] max-w-[530px] text-[1.25rem] leading-8">{str(data.subtitle)}</p>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {buttons.map((b, i) =>
              b.href ? (
                <Link key={i} href={b.href} className={btn}>
                  {b.label ?? ""}
                </Link>
              ) : (
                // href'siz buton (krontech'te modal acar) -> gorsel parite, tiklanamaz
                <span key={i} className={`${btn} cursor-default`}>
                  {b.label ?? ""}
                </span>
              ),
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

function Hero({ data }: BlockProps): ReactElement {
  // variant='product' => urun banner'i (bg gorseli + lead + butonlar).
  if (data.variant === "product") return <ProductBanner data={data} />;
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
                // kucuk ikon: boyutlari degisken -> raw img + lazy yeterli
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.icon.url}
                  alt={it.icon.alt ?? it.label ?? ""}
                  loading="lazy"
                  decoding="async"
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
    // krontech "Why Kron?" mavi band: koyu diyagonal mavi zemin + ince doku + beyaz metin
    <section
      className="relative overflow-hidden text-white"
      style={{ background: "linear-gradient(115deg, #1563FF 0%, #103aa0 55%, #0a2a6e 100%)" }}
    >
      {/* ince diyagonal doku (krontech bg-sec hissi, asset'siz) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent 0 40px, rgba(255,255,255,0.6) 40px 41px)",
        }}
      />
      <Container wide className="relative py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2
              className="text-[2.25rem] font-light leading-[1.15] md:text-[3rem] [&_b]:font-normal [&_b]:text-white"
              dangerouslySetInnerHTML={{ __html: str(data.title) }}
            />
            {str(data.body) && (
              <p className="mt-6 max-w-lg text-[1.2rem] leading-8 text-white/80">{str(data.body)}</p>
            )}
            {cta?.href && (
              <Link
                href={cta.href}
                className="mt-8 inline-block rounded-none border-2 border-white px-[40px] py-3 text-[16px] font-medium text-white transition-colors hover:bg-white hover:text-primary"
              >
                {cta.label ?? ""}
              </Link>
            )}
          </div>
          <div className="flex justify-center">
            {img?.url ? (
              // next/image: otomatik WebP/AVIF + lazy + CLS korumasi (Core Web Vitals)
              <Image src={img.url} alt={img.alt ?? ""} width={800} height={600} className="h-auto w-full max-w-[520px]" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-lg bg-white/10" />
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
              <Image src={img.url} alt={img.alt ?? ""} width={800} height={600} className="h-auto w-full" />
            ) : (
              <div className="aspect-[4/3] w-full rounded-lg bg-gradient-to-br from-primary/20 to-dark/10" />
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

// Urun sayfasi: banner alti breadcrumb (11px, son oge bold) + ikonlu sekme cubugu
// (krontech #nav-tabs-wrapper: 64px, 14px/500, #a7a7a8, aktifte mavi alt cizgi + renkli ikon).
// Sekmeler gercek sayfalara gider (stub PAGE entry'leri seed'de); href'siz sekme tiklanamaz.
function ProductTabs({ data }: BlockProps): ReactElement {
  const crumbs = arr<string>(data.breadcrumb);
  const tabs = arr<{ label?: string; href?: string; icon?: string; active?: boolean }>(data.tabs);
  return (
    <section className="bg-surface">
      <Container>
        {crumbs.length > 0 && (
          <ol className="flex flex-wrap items-center gap-1 pt-3 text-[11px] text-[#333]">
            {crumbs.map((c, i) => (
              <li key={i} className={i === crumbs.length - 1 ? "font-semibold" : ""}>
                {i > 0 && <span className="mx-1 font-normal text-[#999]">/</span>}
                {c}
              </li>
            ))}
          </ol>
        )}
        <ul className="mt-3 flex flex-wrap justify-between">
          {tabs.map((t, i) => {
            const base =
              "flex h-16 w-full items-center justify-center border-b-[3px] px-3 text-[14px] font-medium uppercase";
            const state = t.active
              ? "border-primary bg-surface text-[#333]"
              : "border-transparent text-[#a7a7a8] hover:text-[#333]";
            const icon = t.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.icon}
                alt=""
                loading="lazy"
                decoding="async"
                className={`mr-[7px] max-h-[20px] max-w-[20px] ${t.active ? "" : "grayscale"}`}
              />
            );
            return (
              <li key={i} className="grow">
                {t.href ? (
                  <Link href={t.href} className={`${base} ${state}`}>
                    {icon}
                    {t.label}
                  </Link>
                ) : (
                  <span className={`${base} cursor-default ${state}`}>
                    {icon}
                    {t.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// Donusumlu gorsel+metin bolumu — krontech urun sayfasi icerik satiri birebir:
// 50/50 kolon, metin tarafi beyaz zemin + ortali dikey, h3 .bgblueb (mavi vurgu),
// paragraflar .lead (1.25rem). body "\n\n" ile coklu paragraf tasir.
function MediaText({ data }: BlockProps): ReactElement {
  const img = data.image as ImageData | undefined;
  const cta = data.cta as Cta | undefined;
  const right = data.imageSide === "right";
  const paras = str(data.body)
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <section>
      <Container className="!px-0">
        <div className="grid md:grid-cols-2">
          <div className={`relative min-h-[240px] overflow-hidden ${right ? "order-1 md:order-2" : "order-1"}`}>
            {img?.url && (
              // fill: konteyner boyutuna gore otomatik srcset (mobil kucuk indirir)
              <Image
                src={img.url}
                alt={img.alt ?? str(data.title)}
                fill
                sizes="(max-width: 768px) 100vw, 570px"
                className="object-cover"
              />
            )}
          </div>
          <div
            className={`flex flex-col items-start justify-center bg-surface px-8 py-10 lg:px-12 ${right ? "order-2 md:order-1" : "order-2"}`}
          >
            {str(data.title) && (
              <h3
                className="text-left text-[1.75rem] font-medium leading-snug text-dark [&_b]:bg-primary [&_b]:px-[3px] [&_b]:text-white"
                dangerouslySetInnerHTML={{ __html: str(data.title) }}
              />
            )}
            {paras.map((p, i) => (
              <p key={i} className="mt-3 text-[1.25rem] leading-8 text-ink-soft first:mt-2">
                {p}
              </p>
            ))}
            {cta?.href && (
              <a
                href={cta.href}
                target={cta.href.startsWith("http") ? "_blank" : undefined}
                rel={cta.href.startsWith("http") ? "noreferrer" : undefined}
                className="mt-6 inline-block rounded-none border-2 border-primary px-[30px] py-2.5 text-[15px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {cta.label ?? ""}
              </a>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

// TESTIMONIAL — mavi gradyan zeminli musteri referans slider'i (client swiper).
function Testimonial({ data }: BlockProps): ReactElement | null {
  const items = arr<TestimonialItem>(data.items);
  if (items.length === 0) return null;
  return <TestimonialSlider items={items} />;
}

// Logo bulutu — basit logo gridi (musteri/partner logolari).
function LogoCloud({ data }: BlockProps): ReactElement {
  const logos = arr<ImageData>(data.logos);
  return (
    <section className="bg-surface">
      <Container className="py-12 text-center">
        {str(data.title) && <h2 className="mb-8 text-2xl font-light text-dark">{str(data.title)}</h2>}
        <div className="flex flex-wrap items-center justify-center gap-10">
          {logos.map((l, i) =>
            l.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={l.url} alt={l.alt ?? ""} loading="lazy" decoding="async" className="max-h-[60px] max-w-[160px] object-contain" />
            ) : null,
          )}
        </div>
      </Container>
    </section>
  );
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
export const REGISTRY: Record<string, (props: BlockProps) => ReactElement | null> = {
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
  PRODUCT_TABS: ProductTabs,
  MEDIA_TEXT: MediaText,
  TESTIMONIAL: Testimonial,
  LOGO_CLOUD: LogoCloud,
};
