import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import type { BlockNode } from "@/lib/types";

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

type BlockProps = { data: Record<string, unknown> };

function Hero({ data }: BlockProps): ReactElement {
  const cta = (data.cta ?? {}) as Cta;
  return (
    <section
      className="relative bg-[#0a1733] bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/hero-bg.png')" }}
    >
      <Container wide className="py-24 md:py-32">
        {str(data.eyebrow) && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            {str(data.eyebrow)}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          {str(data.title)}
        </h1>
        {str(data.subtitle) && (
          <p className="mt-5 max-w-2xl text-lg text-white/80">{str(data.subtitle)}</p>
        )}
        {cta.href && (
          <Link
            href={cta.href}
            className="mt-8 inline-block rounded-md bg-primary px-6 py-3 text-base font-medium text-white transition-colors hover:bg-primary-600"
          >
            {cta.label ?? ""}
          </Link>
        )}
      </Container>
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

// Registry: yeni blok tipi = buraya bir bilesen ekle (modulerlik).
const REGISTRY: Record<string, (props: BlockProps) => ReactElement> = {
  HERO: Hero,
  SECTION_HEADING: SectionHeading,
  STATS: Stats,
  FEATURE_GRID: FeatureGrid,
  FAQ: Faq,
  RICH_TEXT: RichText,
};

export function Blocks({ blocks }: { blocks: BlockNode[] }): ReactElement {
  return (
    <>
      {blocks.map((b) => {
        const Component = REGISTRY[b.type];
        return Component ? <Component key={b.id} data={b.data} /> : null;
      })}
    </>
  );
}
