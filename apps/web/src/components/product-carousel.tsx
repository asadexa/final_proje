"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export interface ProductCard {
  name: string;
  description?: string;
  href?: string;
  features?: string[];
  image?: { url?: string; alt?: string };
}

// "Kron Products" — krontech productslider birebir:
// ust gorsel kenarlara tasar, 24px urun adi, bullet ozellikler, ust-cizgili "Learn More".
export function ProductCarousel({
  products,
  moreLabel = "Learn More",
}: {
  products: ProductCard[];
  moreLabel?: string;
}): ReactElement {
  return (
    <Swiper
      modules={[Pagination, Navigation, Autoplay]}
      spaceBetween={24}
      slidesPerView={1}
      breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
      pagination={{ clickable: true }}
      navigation
      autoplay={{ delay: 7000, disableOnInteraction: false }}
      className="product-carousel pb-12"
    >
      {products.map((p, i) => {
        const features = p.features ?? [];
        const card = (
          <div className="flex h-full flex-col border border-[#cacaca] bg-white px-8 pt-10 text-[#4d5154] transition group-hover:border-primary">
            {/* gorsel kenarlara tasar (krontech: negatif margin) */}
            <div className="-mx-8 -mt-10 mb-1 overflow-hidden">
              {p.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image.url} alt={p.image.alt ?? p.name} className="w-full" />
              ) : (
                <div className="aspect-[16/9] w-full bg-surface-muted" />
              )}
            </div>
            <h4 className="pt-5 text-2xl font-bold leading-tight text-[#212529]">{p.name}</h4>
            {p.description && <p className="mt-3 text-sm leading-6">{p.description}</p>}
            {features.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {features.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto border-t-2 border-[#d6d6d6] pt-6 pb-1 text-center text-[18px] font-medium text-primary">
              {moreLabel} →
            </div>
          </div>
        );
        return (
          <SwiperSlide key={i} className="h-auto">
            {p.href ? (
              <Link href={p.href} className="group block h-full">
                {card}
              </Link>
            ) : (
              card
            )}
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
