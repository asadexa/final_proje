import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

export interface HeroSlideData {
  eyebrow?: string;
  title: string; // <b>...</b> => mavi vurgu (krontech .bgblueb b)
  subtitle?: string;
  cta?: { label?: string; href?: string };
  image?: { url?: string }; // slide arka plani (krontech slider bg)
  graphic?: { url?: string }; // sag taraf seffaf urun cemberi (krontech slaytimagesmobil)
}

// Tek hero slide — carousel ve tekli hero ortak kullanir (DRY).
// graphic varsa iki kolon (sol metin, sag krontech urun cemberi); yoksa tam genislik.
// Sunum amacli: hook yok, hem sunucu hem istemci bileseninden render edilebilir.
export function HeroSlide({ slide }: { slide: HeroSlideData }): ReactElement {
  const cta = slide.cta;
  const graphic = slide.graphic;

  const text = (
    <div className="max-w-xl text-left">
      {slide.eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          {slide.eyebrow}
        </p>
      )}
      {/* krontech .display-3 (4.5rem / weight 300) + .bgblueb b (mavi vurgu) */}
      <h1
        className="text-4xl font-light leading-[1.1] tracking-tight text-white md:text-5xl lg:text-[4rem] [&_b]:bg-primary [&_b]:px-[3px] [&_b]:font-bold [&_b]:text-white"
        dangerouslySetInnerHTML={{ __html: slide.title }}
      />
      {slide.subtitle && (
        <p className="mt-5 max-w-lg text-xl leading-8 text-white/80">{slide.subtitle}</p>
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

  // krontech hero tam-ekran: header (~7.5rem) dusulmus viewport yuksekligi =>
  // sayfa acildiginda hero ekrani tam doldurur, altinda yarim beyaz bolum kalmaz.
  return (
    <div className="mx-auto flex min-h-[520px] max-w-[1200px] items-center px-4 py-16 sm:px-6 md:min-h-[calc(100svh_-_7.5rem)]">
      {graphic?.url ? (
        <div className="grid w-full items-center gap-8 md:grid-cols-2">
          {text}
          <div className="hidden justify-center md:flex">
            {/* hero grafigi LCP adayi: priority. SVG'ler next/image yerine duz img
                (next/image SVG icin dangerouslyAllowSVG ister; statik SVG icin gereksiz). */}
            {graphic.url.endsWith(".svg") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={graphic.url} alt="" className="h-auto w-full max-w-[560px]" />
            ) : (
              <Image src={graphic.url} alt="" width={600} height={600} priority className="h-auto w-full max-w-[600px]" />
            )}
          </div>
        </div>
      ) : (
        <div className="w-full">{text}</div>
      )}
    </div>
  );
}
