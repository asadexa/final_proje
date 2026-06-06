import Link from "next/link";
import type { ReactElement } from "react";

export interface HeroSlideData {
  eyebrow?: string;
  title: string; // <b>...</b> => mavi vurgu (krontech .bgblueb b)
  subtitle?: string;
  cta?: { label?: string; href?: string };
  image?: { url?: string };
}

// Tek hero slide icerigi — carousel ve tekli hero ortak kullanir (DRY).
// Sunum amacli: hook yok, hem sunucu hem istemci bileseninden render edilebilir.
export function HeroSlide({ slide }: { slide: HeroSlideData }): ReactElement {
  const cta = slide.cta;
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 md:py-32">
      {slide.eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          {slide.eyebrow}
        </p>
      )}
      {/* krontech .display-3 (4.5rem / weight 300) + .bgblueb b (mavi vurgu) */}
      <h1
        className="max-w-3xl text-4xl font-light leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[4.5rem] [&_b]:bg-primary [&_b]:px-[3px] [&_b]:font-bold [&_b]:text-white"
        dangerouslySetInnerHTML={{ __html: slide.title }}
      />
      {slide.subtitle && (
        <p className="mt-5 max-w-2xl text-lg leading-7 text-white/80">{slide.subtitle}</p>
      )}
      {cta?.href && (
        <Link
          href={cta.href}
          className="mt-8 inline-block rounded-none bg-primary px-[50px] py-3 text-[18px] font-normal leading-[34px] text-white transition-colors hover:bg-primary-600"
        >
          {cta.label ?? ""}
        </Link>
      )}
    </div>
  );
}
