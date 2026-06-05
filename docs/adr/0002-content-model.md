# ADR 0002 — Icerik Modelleme Kararlari

- **Durum:** Kabul edildi
- **Tarih:** 2026-06-04
- **Ilgili:** [`../content-model.md`](../content-model.md), [`schema.prisma`](../../apps/api/prisma/schema.prisma)

## Baglam

krontech.com'u headless CMS olarak modelliyoruz: cok dilli (TR/EN), bilesenlerden olusan
sayfalar, urun ve blog yonetimi, SEO/GEO. Model "dogruluk + genisletilebilirlik" ile
degerlendiriliyor. Uc cekirdek karar proje sahibi ile birlikte alindi.

## Karar 1 — Tek `Entry` tablosu (+ 1:1 detay)

PAGE / PRODUCT / POST tek `Entry` tablosunda; tur-ozel alanlar `ProductDetail` / `PostDetail`
1:1 tablolarinda.

- **Neden:** Gercek sitede urun/cozum/blog **flat kok URL** (orn. `/kron-pam`). Tek
  `@@unique([localeCode, slug])` + tek cozumleyici tum tipleri kapsar; yayin/SEO/i18n/blok
  mantigi 3 yerde tekrarlanmaz.
- **Alternatif:** Ayri Page/Product/Post tablolari — slug benzersizligi ve cozumleme dagilir,
  ortak mantik tekrarlanir. **Reddedildi.**
- **Sonuc:** Tur-ozel zorunlu alanlar uygulama katmaninda dogrulanir (DB'de nullable detay).

## Karar 2 — `Locale` (tablo) + `TranslationGroup`

Her icerik bir locale'e ait; ceviriler `TranslationGroup` ile eslesir. Diller **enum degil tablo**.

- **Neden:** Diller yapisal farklilasabilir; bir icerik tek dilde olabilir (kismi ceviri).
  hreflang ve admin'de "icerik eslestirme" dogal. Tablo => yeni dil eklemek **migration'siz**.
- **Alternatif:** Alan-bazli ceviri (tek kayit + translations tablosu) — diller birebir ayni
  yapida olmali; kurumsal lokalize icerikte esnek degil. **Reddedildi.**
- **Sonuc:** Sorgularda locale filtresi; hreflang icin grup uzerinden kardes kayitlar.

## Karar 3 — Blok tabanli kompozisyon (`ContentBlock`)

`ContentBlock(type, order, enabled, data: JSON)`. Her blok tipinin `data` semasi
`packages/shared` icinde Zod ile.

- **Neden:** Bilesen ekleme/siralama serbest; **yeni blok tipi = enum + Zod sema + render
  bileseni** (migration yok). Headless CMS standardi; en yuksek genisletilebilirlik.
- **Alternatif:** Tip basina ayri tablo — rijit, her tip icin migration, generic editor zor.
  **Reddedildi.**
- **Sonuc:** `data` JSON; tip guvenligi Zod ile saglanir (admin girdi dogrulama + FE tipli okuma,
  **no `any`**).

## Genel sonuc

16 entity'lik tutarli model: tek cozumleyici, tek yayin/SEO/i18n/blok mantigi, migration'siz
genisleme (dil/blok). Detay ve gereksinim-esleme: [`../content-model.md`](../content-model.md).
