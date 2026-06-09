# Karsilastirma — krontech.com vs Rebuild

> Sunum artefakti. Amac: (1) **tasarim parity**'sini element element kanitlamak ve
> (2) iki sistemin **mimarisini** karsilastirip rebuild'in degerini netlestirmek.
> Iliskili: [`site-analysis.md`](site-analysis.md) (icerik modeli recon'u),
> [`decision-log.md`](decision-log.md) (karar gerekceleri), [`architecture.md`](architecture.md).

## 0. Yontem ve kapsam uyarisi (ONEMLI)

Recon **istemci taraflidir**: yalnizca tarayicidan gozlemlenebilen sey olcumlenir —
HTML/CSS/JS, 3rd-party scriptler, asset listesi, istek sayisi/boyutu, CMS parmak izi.

- **Gozlemlenen (observed):** frontend yigini, ucuncu-parti katman, CDN, fontlar, gorsel
  agirligi, URL/yol semasi → bunlar dogrudan kanit (network log + `style.css`).
- **Cikarsanan (inferred):** "ozel, sunucu-render CMS" → yalnizca yol semasindan
  (`enjekte.*.js`, `/_upload/...`) cikarim.
- **Gorunmeyen (invisible):** backend dili, veritabani, API tasarimi, kimlik dogrulama,
  cache/invalidation, yayin/taslak akisi, admin paneli. **Disaridan olculemez.**

> Tez: **Bizim rebuild'de sahiplendigimiz katman, tam da krontech'te disaridan
> gorunmeyen katmandir.** Bu yuzden bu bir "gorsel klon" degil; tasarimi referans alan,
> altinda tam bir sistem olan bir yeniden insadir (odev: "gorsel klon degil, butuncul sistem").

Olcum kaynagi: krontech.com ana sayfa (2026-06), 145 HTTP islemi, document 120 KB.

---

## 1. Tasarim parity checklist

Durum: ✅ Eslesti · 🟡 Kismi · ⬜ Bekliyor. Kanit = krontech'ten **cikarilan gercek CSS**
(`style.css`) + bizim **dosya:bilesen** referansi (+ asagidaki gorsel kanit).

| Alan | krontech (gercek deger) | Bizim implementasyon | Durum |
|------|--------------------------|----------------------|:----:|
| Palet (primary) | `#1563ff` | `--color-primary` `globals.css` | ✅ |
| Tipografi | Roboto; body **14px**; `.display-3` 4.5rem/300 | Roboto (300–700) `layout.tsx`; `hero-slide.tsx` `text-[4.5rem] font-light` | ✅ |
| Arka plan | body `#f5f6f8` | `globals.css` body | ✅ |
| Container | `.container` 1140px / `.extended-container` 1200px | `Container` `blocks.tsx` (1140/1200) | ✅ |
| Mavi vurgu | `.bgblueb b { background:#1563ff; color:#fff; padding:0 3px }` | `[&_b]:bg-primary [&_b]:text-white [&_b]:px-[3px]` `hero-slide.tsx` | ✅ |
| Butonlar | `.btn` **border-radius:0** + 50px yatay padding | `rounded-none px-[50px]` `hero-slide.tsx` | ✅ |
| Header | duyuru bari + sticky + nav(dropdown) + arama + dil | `site-header.tsx` + `nav.ts` | ✅ |
| Hero | `#main-slider` Swiper; 2 zemin + per-slide **seffaf urun cemberi** (slaytimagesmobil) | `hero-carousel.tsx` **5 slide**, 2 kolon (metin + urun grafigi), per-slide zemin, yuksek | ✅ |
| Urun showcase | "Kron Products" **gorselli** kart slider (productslider) | `PRODUCT_SHOWCASE` → `product-carousel.tsx` (5 gercek urun + gorsel) | ✅ |
| Deger onermesi | "Why Kron?" **iki kolon** (metin + gorsel + outline btn) | `VALUE_PROP` iki kolon + `why-kron.png` | ✅ |
| Istatistik | "6 kita / 35+ / 200+ / 1500+" **ikonlu** | `STATS` + ikon gorselleri | ✅ |
| Vaka calismasi | banka **gorseli** + `bgblueb` 28px baslik | `CASE_STUDY` + `case-bank.png` | ✅ |
| Blog karuseli | "Keep up to Date" badge + **kapak** + tarih | `BLOG_CAROUSEL` + `Entry.coverImage` (Media) | ✅ |
| Footer | `footer{bg #000; pt 50px}` + `.subfooter #0f1010`; 4 kolon; baslik 16px/600; link beyaz/.5 hover `#1563ff` | `site-footer.tsx` + `footer.ts` | ✅ |
| Blog **detay** sayfasi | makale: kapak+meta | `[slug]/page.tsx`: breadcrumb + POST kapak/tarih + article-prose RICH_TEXT | ✅ |
| **Urun detay** sayfasi | `.product-banner` (bg gorseli + `.display-3` + `.lead` + 2 outline btn) → breadcrumb 11px → `#nav-tabs-wrapper` **ikonlu sekmeler** (64px, 14px/500, `#a7a7a8`, aktif: mavi alt cizgi + renkli ikon, pasif ikon `grayscale`) → **donusumlu 50/50 metin+gorsel** bolumler (h3 `bgblueb`, p `.lead`) → PAM: `.blue-bg-slider` **musteri referans slider'i** (gradyan `#1596FF→#1563FF`, pt-100/pb-144, `.slider-logo` 160x60, `bgwhiteb b` beyaz kutu vurgu, yazar 12px/.8) + Sekerbank **video basari hikayesi** | `HERO variant='product'` + `PRODUCT_TABS` + `MEDIA_TEXT` (×3-5, `cta`'li Sekerbank dahil) + `TESTIMONIAL` (`testimonial-slider.tsx`); icerik `scripts/extract-product-pages.py` ile cikarildi, gorseller sharp-optimize (`public/kron/products/`, 35 dosya ~1MB) | ✅ |
| **Blog liste** sayfasi | banner 226px (overlay `.41`, h1 32/600) + breadcrumb 11px + **col-8/col-4**; kart: kapak **411px**, seffaf kart, `blog-terms` (bold tarih + Read More→ 14/600), ayirici `#dedede`/42px; **5 yazi/sayfa + pagination** (`/blog/2`); sticky **Highlights** (150x87 `mix-blend-luminosity`, 14px baslik, `bgblueb` cipli h3) | `blog-list-view.tsx` + `blog/[page]` route; Highlights = `Entry.featured` (admin checkbox + `?featured=true` API) | ✅ |
| Iletisim/demo formu (koyu `footer-top`) | `.footer-top.dark-form`: zemin gorsel + `rgba(0,0,0,.83)` overlay, py 110px, baslik 32/bold; seffaf input h-46; KVKK 12px/.51; btn-block | `footer-contact-form.tsx` (sitewide, `[locale]/layout.tsx`); `footer-contact` FormDefinition + KVKK + honeypot (reCAPTCHA yerine — bkz. Notlar) | ✅ |

**Onemli ayrim — "tasarim sistemi" parity'si, piksel klonu degil.** Renk, tipografi,
spacing, bilesen anatomisi ve yerlesim birebir esitlenir; icerik/gorseller temsilidir.

### Gorsel kanit

Headless tarayici (gstack/browse, 1440x900) ile cekildi — krontech.com vs
http://localhost:3000/en. Sol: krontech (referans), sag: rebuild.

**Header + Hero** — duyuru bari, tam nav, koyu hero, **mavi-vurgu** basliklar (`bgblueb`), kare buton:

| krontech.com | Rebuild |
|---|---|
| ![krontech header](img/comparison/header-krontech.png) | ![rebuild header](img/comparison/header-ours.png) |

**Footer** — `#000` 4-kolon (Products / Sectors / About Us / Social Media) + subfooter yasal linkler:

| krontech.com | Rebuild |
|---|---|
| ![krontech footer](img/comparison/footer-krontech.png) | ![rebuild footer](img/comparison/footer-ours.png) |

**Tam sayfa** — bolum akisi (hero → showcase → why kron → numbers → case study → blog → footer):

| krontech.com | Rebuild |
|---|---|
| ![krontech full](img/comparison/full-krontech.png) | ![rebuild full](img/comparison/full-ours.png) |

**Blog listesi** — banner + breadcrumb + 2 kolon (liste 411px kapaklar + pagination / sticky Highlights) + footer-ustu koyu form:

| krontech.com/tr/blog | Rebuild /tr/blog |
|---|---|
| ![krontech blog](img/comparison/blog-krontech.png) | ![rebuild blog](img/comparison/blog-ours.png) |

**Urun detay (Kron PAM)** — banner + ikonlu sekmeler + donusumlu bolumler + mavi referans slider'i + Sekerbank video hikayesi:

| krontech.com/kron-pam | Rebuild /en/kron-pam |
|---|---|
| ![krontech product](img/comparison/product-krontech.png) | ![rebuild product](img/comparison/product-ours.png) |

> Footer neredeyse **piksel-esit** (ayni kolonlar/linkler/sosyal ikonlar/yasal bar). **Bolum sirasi
> da artik krontech ile ayni** (Hero → Products → Why Kron → Numbers → Case Study → Blog).
> Onceki tek yapisal fark olan footer-ustu koyu **"Contact Us / Bize Ulasin" formu da kapatildi**
> (`footer-contact-form.tsx`, tum sayfalarda). Anasayfa bolumleri ve blog listesi
> **gercek krontech asset'leriyle** birebir esitlendi.

---

## 2. Mimari karsilastirma

| Katman | krontech.com (gozlemlenen / cikarsanan) | Rebuild (bizim — bilinen) |
|--------|------------------------------------------|----------------------------|
| Render | Monolitik **sunucu-render** tek HTML (120 KB) | **Next.js 16** App Router, SSR + ISR, RSC |
| Frontend | jQuery **3.4.1 (+ ikinci jQuery)**, Bootstrap, **Swiper + Owl** (2 carousel), Colorbox+lity (2 lightbox), sweetalert, intlTelInput, maskedinput, sticksy, lazysizes | **React 19 + TypeScript** (no `any`), Tailwind v4, **tek** carousel (swiper/react), tipli blok registry |
| CMS | **ozel "enjekte"** (cikarim: `enjekte.core/project.js`, `/project/_resources/`, `/_upload/{slayt,listcontent,menu,...}images`) | **Headless, API-first**: tek `Entry` (PAGE/PRODUCT/POST) + blok modeli (`type+order+data`) |
| Icerik tipi | Yola gomulu, alan adlari sizan (slayt/listcontent/menu) | `BlockType` enum + **`@kron/shared` Zod semalari** (FE/BE tek kaynak) |
| Backend | **GORUNMEZ** (dil/framework bilinmiyor) | **NestJS** (feature modulleri, guard/pipe, Swagger `/docs`) |
| Veritabani | **GORUNMEZ** | **PostgreSQL + Prisma 7** (migration, tipli) |
| API | **GORUNMEZ** | **REST + Swagger**, rate limit, DTO + class-validator |
| Auth | **GORUNMEZ** (admin paneli disaridan yok) | **JWT** httpOnly cookie + refresh rotation, **RBAC** (ADMIN/EDITOR) |
| Cache | Cloudflare kenar cache (gozlemlenen) | **Redis** uygulama cache + tag invalidation; Next ISR |
| Medya | `/_upload/...` (sunucu fs, cikarim) | **MinIO / S3** uyumlu (yeniden kullanilabilir medya kutuphanesi) |
| i18n | TR `/tr`, EN buyuk olcude oneksiz | Temiz `/tr` + `/en`, native Next i18n + `TranslationGroup` (hreflang) |
| Calistirma | — (gorunmez) | **`docker compose up`** tek komut (postgres/redis/minio/api/web) |
| 3rd-party | **Cok agir** (Bolum 3) | Yok (analitik/izleme opsiyonel, kapsamda degil) |

**Okuma:** krontech satirlarinin yarisi "GORUNMEZ". Bir rakibin frontend'ini kopyalamak
kolaydir; degerli ve degerlendirilen kisim **gorunmeyen sistemdir** (icerik modeli, API,
auth, yayin akisi, cache) — bizim insa ettigimiz tam da bu.

---

## 3. Performans / agirlik notu

**krontech (gozlemlenen):** ~**145 HTTP istegi**. Agirligin buyuk kismi icerik degil:

- **Ucuncu-parti / izleme:** GTM (457 KB) + birden cok gtag (388/540/380 KB), GA + GA4,
  Google Ads/DoubleClick remarketing (**2 conversion ID**), **Facebook Pixel** (371+230 KB),
  **LinkedIn Insight** (217 KB ×2), OneTrust, **reCAPTCHA `recaptcha__tr.js` 876 KB × 4 frame**,
  Leadfeeder, **ZoomInfo**, ipapi.
- **Optimize edilmemis gorseller:** `GroupZ9.png` **1 MB**, `slider_bg_kc` 635 KB,
  `analysts-back` 459 KB + ~8 mobil slayt PNG'si 160–245 KB. Responsive `srcset`/WebP **yok**.
- **Iki jQuery + iki carousel + iki lightbox** (mukerrer kutuphane).
- Gozle gorulur hatalar: `krontech.com/Array` → **404**, OneTrust `consent//.json` → **404**.

**Rebuild yaklasimi:**

- **SSR + ISR** (`fetch(revalidate, tags)`) + **Redis** → tekrar eden istekte DB'ye gitmez.
- **Tek** carousel kutuphanesi; bilesenler tipli ve gerektiginde yuklenen ("use client" yalniz
  carousel'larda).
- Next/font ile Roboto (yalniz kullanilan agirliklar). **Public gorseller `sharp` ile optimize**
  (display-aware resize + PNG palette / JPG mozjpeg). **Ayni kaynak gorseller, optimize edilmis:**
  `GroupZ9` (banka vaka) 1 MB→**170 KB**, `slider_bg_kc` 635 KB→**124 KB**, ikonlar ~100 KB→**~10 KB**;
  `public/kron` toplam ~3.5 MB→**0.9 MB**. (Yuklenen medya icin S3 pipeline + ileride `next/image`.)
- Pazarlama/izleme **kapsam disi** (eklenirse GTM ile tek noktadan, KVKK/OneTrust ile).

> Adil olalim: ucuncu-parti agirligin cogu **pazarlama kararidir**, muhendislik kusuru
> degil. Ama mukerrer kutuphaneler, optimize edilmemis PNG'ler ve `srcset` eksikligi
> dogrudan iyilestirilebilir teknik borctur — rebuild bunlardan kacinir.

---

## 4. Sonuc

- **Tasarim:** Header, hero (carousel + tipografi + mavi vurgu), anasayfa bolumleri ve footer
  krontech'in **gercek CSS degerleriyle** birebir; kanit tahmin degil, `style.css` + kod.
- **Mimari:** krontech bir klasik monolitik jQuery/Bootstrap + ozel CMS sitesi; rebuild
  modern, **headless, API-first, tipli, cache'li, container'li** bir sistem.
- **Asil mesaj:** Disaridan gorunen frontend taklit edilebilir; **degerlendirilen katman
  gorunmeyen sistemdir** (icerik modeli, API, auth, yayin, SEO/GEO, performans) — odev de
  tam olarak bunu istiyor ("altyapi dogru kurulmazsa calisma basarisiz sayilir").

---

## 5. Notlar

- **Gorsel kanit cekildi** (Bolum 1) — headless tarayici (gstack/browse) ile, manuel mudahale
  yok; krontech cookie banner'i otomatik temizlendi. Yeniden uretim: `docs/img/comparison/README.md`.
- **Bekleyen parity** (durust): yalnizca krontech'in koyu **footer-ustu inline iletisim formu**
  (bizde ayri `/contact` sayfasi). Anasayfa + urun/blog **detay** parity'si tamam — gercek krontech
  asset'leriyle (productslider gorselleri, banka vaka, Why-Kron, ikonlar, hero zemini, blog kapaklari).
- **Olcum kaynagi:** krontech.com ana sayfa (2026-06), 145 HTTP islemi (network log) + `style.css`.
