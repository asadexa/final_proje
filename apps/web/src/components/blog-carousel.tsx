"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

export interface BlogCardItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
}

// "Keep up to Date" — son yazilar carousel'i (krontech blog karuseli birebir).
export function BlogCarouselClient({
  title,
  posts,
  locale,
}: {
  title?: string;
  posts: BlogCardItem[];
  locale: string;
}): ReactElement {
  return (
    <section className="bg-surface-muted">
      <div className="mx-auto max-w-[1140px] px-4 py-16 sm:px-6">
        {title && <h2 className="mb-10 text-2xl font-bold text-dark">{title}</h2>}
        <Swiper
          modules={[Pagination, Navigation, Autoplay]}
          spaceBetween={24}
          slidesPerView={1}
          breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          pagination={{ clickable: true }}
          autoplay={{ delay: 7000, disableOnInteraction: false }}
          className="blog-carousel pb-12"
        >
          {posts.map((p) => (
            <SwiperSlide key={p.id} className="h-auto">
              <Link
                href={`/${locale}/${p.slug}`}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-6 transition hover:border-primary hover:shadow-sm"
              >
                <h3 className="text-lg font-semibold text-dark">{p.title}</h3>
                {p.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{p.excerpt}</p>
                )}
                <span className="mt-auto pt-4 text-sm font-medium text-primary">→</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
