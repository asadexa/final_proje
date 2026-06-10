"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

export interface TestimonialItem {
  title: string;
  quote: string;
  author?: string;
  image?: { url?: string; alt?: string };
  logo?: { url?: string; alt?: string };
}

// Musteri referans slider'i — krontech .blue-bg-slider birebir:
// gradyan zemin (180deg #1596FF -> #1563FF), pt-100/pb-144,
// sol gorsel (735x500) + sag metin; h3 500, p 15px/27px, yazar 12px/.8.
export function TestimonialSlider({ items }: { items: TestimonialItem[] }): ReactElement {
  return (
    <section
      className="text-white"
      style={{ backgroundImage: "linear-gradient(180deg, #1596FF 0%, #1563FF 100%)" }}
    >
      <div className="mx-auto max-w-[1140px] px-4 pb-[144px] pt-[100px] sm:px-6">
        <Swiper
          modules={[Pagination, Autoplay]}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{ delay: 7000, disableOnInteraction: false }}
          className="testimonial-slider !overflow-visible"
        >
          {items.map((it, i) => (
            <SwiperSlide key={i}>
              <div className="grid items-center gap-10 md:grid-cols-2">
                <div>
                  {it.image?.url && (
                    <Image src={it.image.url} alt={it.image.alt ?? it.title} width={735} height={500} className="h-auto w-full" />
                  )}
                </div>
                <div>
                  {it.logo?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.logo.url}
                      alt={it.logo.alt ?? ""}
                      loading="lazy"
                      decoding="async"
                      className="mb-4 max-h-[60px] max-w-[160px]"
                    />
                  )}
                  {/* krontech .bgwhiteb b: beyaz kutu icinde mavi metin */}
                  <h3
                    className="text-left text-[1.75rem] font-medium leading-snug [&_b]:bg-white [&_b]:px-[3px] [&_b]:text-primary"
                    dangerouslySetInnerHTML={{ __html: it.title }}
                  />
                  <p className="mt-4 text-left text-[15px] leading-[27px]">{it.quote}</p>
                  {it.author && (
                    <p className="mt-3 text-left text-[12px] opacity-80">{it.author}</p>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
