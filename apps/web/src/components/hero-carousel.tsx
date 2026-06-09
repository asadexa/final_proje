"use client";

import type { ReactElement } from "react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { HeroSlide, type HeroSlideData } from "./hero-slide";

// Cok-slide hero (krontech main-slider birebir). swiper/react ile —
// orijinal site de Swiper kullaniyor, parity dogrudan.
export function HeroCarousel({ slides }: { slides: HeroSlideData[] }): ReactElement {
  return (
    <section className="hero-carousel relative text-white">
      {/* krontech canli olcum (runtime swiper.params): effect=fade, crossFade=false,
          speed=300, autoplay.delay=7000 — yeni slide eskisinin USTUNE fade olur. */}
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: false }}
        speed={300}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={{ delay: 7000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div
              className="bg-[#0a1733] bg-cover bg-center"
              style={{ backgroundImage: `url('${slide.image?.url ?? "/hero-bg.png"}')` }}
            >
              <HeroSlide slide={slide} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
