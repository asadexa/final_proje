"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export interface BlogCardItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  image?: string | null;
  date?: string | null;
}

// "Keep up to Date" — son yazilar carousel'i (krontech blog_swiper birebir):
// "Blog" rozeti + kapak gorseli + baslik + tarih / Read More.
export function BlogCarouselClient({
  title,
  posts,
  locale,
}: {
  title?: string;
  posts: BlogCardItem[];
  locale: string;
}): ReactElement {
  const readMore = locale === "tr" ? "Devamını Oku" : "Read More";
  return (
    <section className="bg-surface-muted">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        {title && (
          <h2 className="mb-10 text-[2rem] font-light text-dark md:text-[2.5rem]">{title}</h2>
        )}
        <Swiper
          modules={[Pagination, Navigation, Autoplay]}
          spaceBetween={24}
          slidesPerView={1}
          breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          pagination={{ clickable: true }}
          navigation
          autoplay={{ delay: 3000, disableOnInteraction: false }} /* krontech olcum: 3000ms */
          className="blog-carousel pb-12"
        >
          {posts.map((p) => (
            <SwiperSlide key={p.id} className="h-auto">
              <Link
                href={`/${locale}/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden border border-line bg-surface transition hover:shadow-md"
              >
                <div className="relative overflow-hidden">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.title}
                      width={730}
                      height={410}
                      className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/15 to-dark/10" />
                  )}
                  <span className="absolute left-3 top-3 bg-primary px-2 py-0.5 text-xs font-medium text-white">
                    Blog
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="line-clamp-3 text-base font-semibold leading-snug text-dark transition-colors group-hover:text-primary">
                    {p.title}
                  </h3>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{p.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                    {p.date && <span className="text-muted">{p.date}</span>}
                    <span className="font-medium text-primary">{readMore} →</span>
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
