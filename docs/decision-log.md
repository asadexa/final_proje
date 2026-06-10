# Karar Gunlugu — Sunum & Mulakat Hazirligi

> Bu dosya **sunum** icin tek noktadan ozet: ne yaptik, **neden**, **nasil** (AI dahil).
> Derin gerekceler ADR'lerde: [`adr/`](adr/). Her faz sonunda guncellenir.

## Zaman cizelgesi

### Faz 0 — Temel & teknoloji kararlari
| Karar | Neden (ozet) | Nasil |
|------|--------------|-------|
| **NestJS** (Spring yerine) | Uctan uca TS, modulerlik, Swagger/guard/pipe first-class | CLI ile scaffold; gerekce [ADR 0001](adr/0001-tech-stack.md) |
| **REST + Swagger** (GraphQL yerine) | Odev Swagger istiyor; cache/rate-limit basit | `@nestjs/swagger`, `/docs` |
| **JWT** (access+refresh) | Stateless, olceklenebilir | bkz [ADR 0003](adr/0003-auth.md) |
| **Vitest + Supertest** | Hiz, ESM, tek arac | Faz 8'de |
| **Monorepo (npm workspaces)** | Ekstra arac yok, Node ile gelir | `apps/*`, `packages/*` |
| **Docker Compose tek komut** | Odev gereksinimi | postgres+redis+minio+api+web |

### Faz 1 — Icerik modeli
| Karar | Neden | Nasil |
|------|------|-------|
| **Tek `Entry` tablosu** | Flat kok URL'ler, tek cozumleyici, ortak mantik | [ADR 0002](adr/0002-content-model.md) |
| **Locale tablo + TranslationGroup** | Migration'siz dil; yapisal farkli ceviri; hreflang | Prisma sema |
| **Blok tabanli icerik** | Bilesen ekleme/siralama; migration'siz yeni tip | `ContentBlock(type,order,data)` |
| **Prisma 7** | Tip guvenligi, migration | prisma-client generator + pg driver adapter |

### Faz 2 — Backend cekirdek (devam ediyor)
| Karar | Neden | Nasil |
|------|------|-------|
| **JWT httpOnly cookie + Bearer fallback** | XSS guvenligi + Swagger/test kolayligi | [ADR 0003](adr/0003-auth.md) |
| **Refresh DB'de (sha256) + rotation** | Iptal mumkun, Redis'siz, test edilebilir | `RefreshToken` modeli |
| **RBAC (ADMIN/EDITOR)** | Basit rol yapisi | `JwtAuthGuard`+`RolesGuard`+`@Roles` |
| **Global rate limit + ValidationPipe** | Guvenlik + girdi dogrulama (no any) | `@nestjs/throttler`, DTO + class-validator |
| **Icerik API (public + admin)** | Flat-URL slug cozumleyici, blok CRUD, hreflang alternates | `content` modulu (public okuma + admin CRUD) |
| **`@kron/shared` Zod blok semalari** | FE/BE tek kaynak tip + dogrulama; yeni blok = sema ekle | Built CJS paket; container'da build + dist container-local |
| **Medya (MinIO/S3)** | Dosya yukleme + medya kutuphanesi (yeniden kullanim) | `media` modulu; @aws-sdk/client-s3; public-read bucket |
| **Redis cache + invalidation** | Public icerik cache; icerik degisince temizlenir | `CacheService` (ioredis); delByPrefix('content:') |

### Faz 4 — Frontend / public site (devam ediyor)
| Karar | Neden | Nasil |
|------|------|-------|
| **Native Next 16 i18n** (next-intl yerine) | Sifir bagimlilik, seffaf, icerik zaten API'den locale bazli | `[locale]` segment + `proxy` + JSON sozluk; ADR 0001 i18n karari guncellendi |
| **Blok registry (FE)** | Yeni blok tipi = tek bilesen (modulerlik) | `components/blocks.tsx`: BlockType -> React bileseni |
| **Tasarim: krontech gercek paleti** | "Tasarim bire bir" istek | `style.css`'ten cikarildi: Roboto + #1563ff mavi, acik tema |
| **SSR + ISR** | Performans + publish'te tazeleme | `fetch(next:{revalidate:60, tags})`; revalidateTag Faz 7'de |
| **Next 16 ozellikleri** | Dogru API kullanimi | async `params`, `PageProps/LayoutProps`, `proxy` (eski middleware) |

### Faz 5 — SEO / GEO
| Karar | Neden | Nasil |
|------|------|-------|
| **generateMetadata (per-page)** | Dinamik title/desc/canonical/OG/twitter | `lib/seo.ts` → entry.seo; Next 16 Metadata API |
| **hreflang (tr/en/x-default)** | Cok dilli SEO, dogru dil esleme | `alternates.languages` (resolve endpoint ceviri grubu) |
| **Dinamik sitemap.xml** | Tum yayindaki icerik + statik sayfa, hreflang ile | `app/sitemap.ts` (`MetadataRoute.Sitemap`) + `listAllEntries` |
| **robots.txt** | Tarama yonergesi + sitemap referansi | `app/robots.ts` (/api, /admin disallow) |
| **schema.org JSON-LD** | GEO: yapilandirilmis veri (botlar + LLM'ler) | Organization/WebSite/Product/Article/**FAQPage**/BreadcrumbList; `components/json-ld.tsx` |
| **Bundled Next 16 dokuman okuma** | metadata/sitemap/robots API egitim verisinden yeni | `node_modules/next/dist/docs/...` okunup uygulandi (korlemesine degil) |

> Kalan: **redirect yonetimi** (301) — `Redirect` tablosu mevcut; admin paneliyle birlikte baglanacak (runtime proxy + cache).

## Kucuk ama anlatilmaya deger teknik kararlar

- **Prisma 7 `prisma-client` generator + `moduleFormat=cjs`:** Yeni generator ESM uretiyordu;
  NestJS CommonJS oldugu icin `import.meta` patliyor → cjs'e zorladik. (Eğitim verisinden farkli; **dokumani okuyup** dogruladik.)
- **Prisma 7 `prisma.config.ts`:** datasource url ve `.env` artik burada (schema'da degil).
- **Driver adapter (`@prisma/adapter-pg`):** Prisma 7 query-compiler ile zorunlu.
- **Docker (Windows) saglamlastirmalari:** `dist`/`src/generated` container-local volume,
  `deleteOutDir:false`, `incremental:false` (stale tsbuildinfo emit'i atliyordu), web api ile
  ayni imaj. → `docker compose up` guvenilir calisiyor.
- **`/admin` Next.js icinde:** Ayri uygulama yerine; daha az hareketli parca, tip paylasimi.

## AI'nin gelistirme surecine katkisi (odev kriteri)

- **Karar destek:** Her gerekceli secimde (backend/API/auth/test, i18n, blok modeli) AI
  alternatifleri + trade-off'lari sundu; secimi proje sahibi onayladi.
- **Guncel teknoloji dogrulama:** Next.js 16 ve Prisma 7 egitim verisinden yeni; AI **bundled
  dokumanlari/web dokumantasyonu okuyup** dogru kurallari uyguladi (korlemesine yazmadi).
- **Hata ayiklama:** Docker'daki `dist/main` bulunamadi sorunu adim adim koke indirildi
  (bind-mount → EBUSY → stale tsbuildinfo) ve kalici cozuldu.
- **Tutarlilik:** Kararlar ADR + bu gunluk ile kayit altinda; kod modulerligi korunarak yazildi.

## Blog liste sayfasi 1:1 + footer formu (2026-06-09)

| Karar | Neden | Nasil |
|------|------|-------|
| **`Entry.featured` alani (Highlights)** | krontech sidebar'i editoryal secim; "en yeni 10" degil. CMS hikayesi: admin'den yonetilir | Prisma migration `entry_featured`; `?featured=true` public filtre (Transform ile guvenli bool parse); admin editorde POST'a ozel checkbox |
| **Sayfalama route'u `/blog/[page]`** | krontech URL deseni (`/blog/2`); query string yerine SEO-dostu yol | `blog/[page]/page.tsx`; sayfa 1 `/blog`a 307 redirect (tek kanonik URL); gecersiz sayfa 404 |
| **5 yazi/sayfa** | krontech'in olculen liste boyutu | `BLOG_PAGE_SIZE=5`, API `pageSize` parametresi zaten vardi |
| **Blog arsivi seed'i data-driven** | 12 cift (tr+en) el yazimi tekrar yerine dizi+dongu; canli düzenlemede tek satir ekleyerek yeni yazi | `BLOG_ARCHIVE[]` + for; ozet/govde metinleri ozgun yazildi, basliklar/tarihler/gorseller krontech referansi |
| **TR seed metinleri gercek Turkce** | Liste basligi sayfanin en gorunur metni; ASCII ("Guvenlik") parity'yi bozuyor | Dictionary'ler zaten UTF-8 Turkce ve sorunsuz; blog metinleri de cevrildi |
| **Footer-ustu form ayri FormDefinition (`footer-contact`)** | Alanlari farkli (Isim/Soyisim/Sirket/Ulke/Telefon); mevcut `contact` formunu bukmek yerine form sisteminin esnekligini gosterir | Seed'e yeni tanim; `footer-contact-form.tsx` ("use client") ayni KVKK+honeypot altyapisi; `[locale]/layout.tsx` ile her sayfada |
| **Gorsel optimizasyon ayni boru hatti** | Onceki turlarla tutarli (sharp, display-aware resize) | `scripts/fetch-blog-images.mjs`: 15 kapak 730px mozjpeg (~420KB toplam); banner+form zemini ayri |
| **Olculen CSS degerleri** | Tahmin degil introspection (sunum hikayesi) | banner 226px + overlay .41; kapak 411px; ayirici `#dedede`/42px; widget gorseli 150x87 `mix-blend-luminosity` (hover'da renk); `bgblueb` cipli "One **Cikanlar**" |

## Urun detay sayfalari 1:1 (2026-06-09)

| Karar | Neden | Nasil |
|------|------|-------|
| **Icerik cikarimi script ile** | 5 urun x 2 dil x ~15 alan elle kopyalanamaz; tekrarlanabilir + sunumda kanit | `scripts/extract-product-pages.py`: krontech HTML -> JSON (hero/breadcrumb/tab/bolum/testimonial); cikti dosyaya yazilir (PS stdout yonlendirmesi UTF-8 bozuyor — ogrenilen gotcha) |
| **TR sayfalarda Turkce ceviri (BILINCLI SAPMA)** | krontech kendi TR urun sayfalarinda govdeyi INGILIZCE birakmis (yalniz nav/breadcrumb TR — 5 urunde de olculdu). Birebir kopya i18n hikayesini oldururdu; tam yerellestirme CMS'in TranslationGroup modelinin gercekten calistigini gosterir | EN metinler krontech'ten birebir; TR ceviriler ozgun (gercek Turkce karakterli); sapma burada belgelendi |
| **Tab bar gorsel 1:1, tek aktif sekme (BILINCLI SAPMA)** | Sekmeler krontech'te alt sayfalara gider (kron-pam-how-it-works vb. ~20 sayfa). Icerik cogaltmasi mimariye yeni sey katmaz; gorsel parity korunur | `PRODUCT_TABS` blogu: ikonlu sekmeler (64px, aktif mavi alt cizgi + renkli ikon, pasif `grayscale` — olculen `.tabmenuicon` filtresi); pasif sekme tiklanamaz `span` |
| **2 yeni blok tipi: `PRODUCT_TABS` + `TESTIMONIAL`** | Mevcut bloklara bukulemez (sekme cubugu + mavi gradyan musteri slider'i ayri anatomiler); blok modeli tam da boyle genisler | `@kron/shared` Zod + Prisma enum migration `product_tabs_testimonial_blocks`; registry'ye 2 bilesen |
| **Urun banner'i = HERO `variant='product'`** | Ayri blok tipi yerine ayni HERO'nun varyanti: migration gerektirmez, admin'de tek HERO kalem | `hero.variant + buttons[]` sema genislemesi; `ProductBanner` dali (`blocks.tsx`) |
| **Sekerbank video hikayesi = MEDIA_TEXT + `cta`** | Yeni blok tipi acmak yerine mevcut blogu kucuk genisletme (outline buton); blok yeniden kullanim hikayesi | `MEDIA_TEXT.cta` opsiyonel alan; krontech `product-success-story` birebir |
| **Breadcrumb PRODUCT_TABS icinde** | krontech DOM sirasi banner -> breadcrumb -> sekmeler; sayfa-ustu breadcrumb'i urunlerde gizleyip blok icinde render etmek CMS-driven kalir | `[slug]/page.tsx` `isProduct` dali; JSON-LD breadcrumb degismedi |
| **Olculen CSS degerleri** | Tahmin degil introspection | `.nav-pills .nav-link` 64px/14px/500/`#a7a7a8` aktif `#1563ff` alt cizgi; `.blue-bg-slider` gradyan `#1596FF->#1563FF` pt-100/pb-144, p 15px/27px, yazar 12px/.8, pagination -80px; `.bgwhiteb b` beyaz kutu + mavi metin; `.slider-logo` 160x60; breadcrumb 11px son oge bold |
| **Gorseller ayni sharp boru hatti** | Onceki turlarla tutarli | `scripts/fetch-product-images.mjs` + `fetch-product-extras.mjs`: 35 dosya (~3.9MB -> ~1.0MB); hero 1920 jpg, bolum 735 jpg, ikon/logo seffaf png palette |

## Kaynaklar + Iletisim sayfalari 1:1 (2026-06-09)

| Karar | Neden | Nasil |
|------|------|-------|
| **TR icerik krontech'ten birebir** | Urun sayfalarinin aksine krontech bu iki sayfayi TR'de GERCEKTEN yerellestirmis (form etiketleri, ofis bilgileri, kart metinleri Turkce) -> ceviri gerekmedi; yalniz TR h2 "RESOURCES" -> "Kaynaklar" (tam-yerellestirme kararinin uzantisi) | `scripts`teki extraction kalibi; cf-email korumali e-postalar decode edildi (XOR) |
| **Olu kart linkleri tiklanamaz** | Case Studies / Datasheets hedef sayfalari kapsam disi; urun sekme cubugu karariyla tutarli (gorsel 1:1, islevsel sapma belgelendi) | Resources kartlarinda yalniz BLOG gercek link (`/blog`); digerleri buton gorunumlu `span` |
| **`contact` FormDefinition 11 alana cikti** | krontech contactPageForm'un gercek alan seti (departman + arama-istegi select'leri dahil); form sistemi field-driven oldugundan SEMA DEGISIKLIGI GEREKMEDI — sadece seed verisi | upsert `update: { fields }`; sunucu validasyonu tanim uzerinden calisir; E2E: gecerli 201 + eksik alan 400 dogrulandi |
| **Ofis verileri statik sayfada** | Nadiren degisen, yapisal olarak sayfaya ozgu veri; Entry/blok modeline zorlamak yapay olurdu (icerik yonetimi gereksinimini formlar + entry'ler zaten karsiliyor) | `contact/page.tsx` icinde locale'e gore dizi; krontech TR/EN ofis sira farki korundu (TR: Ist/Ank/Izm/ABD, EN: Ist/USA/Ank/Izm) |
| **Paylasilan `page-banner.tsx`** | Iki sayfa ayni krontech kalibini kullaniyor (`pages-top-image` 226px + `breadcrumb-desktop`); h1 gorunmez ama erisilebilir (`sr-only` = krontech `display-3 invisible` karsiligi) | Olculen: `.gray-bg-top` 226px/bg-#000/cover, `no-overlay`; breadcrumb 11px son oge bold |
| **Olculen kart detaylari** | Tahmin degil introspection | `.carouselContainer` p-20 + golge `0 6px 12px -4px rgba(37,38,41,.12)` + gorsel -20px tasma; `.gradient-img::after` mavi gradyan op .8; `.notch` yan kertikler (#f5f6f8 ucgen, top 50% + 50px); `.big-from .form-control` h-50 / `#a7a7a8`; `.contactinfo` deger sutunu 230px, ikonlar #1563ff |
| **Telefon ulke-bayragi secici atlandi** | krontech intlTelInput 3rd-party'si; form degerine katkisi yok, agirlik ekler (performans notumuzla celisirdi) | Duz `tel` input; sapma burada belgelendi |

## Admin paneli bosluk kapatma turu (2026-06-09) — PDF "Backend / Admin Panel" eksiksiz

| Karar | Neden | Nasil |
|------|------|-------|
| **SEO panel genisletme: UI-only** | SeoDto + Prisma modeli + public metadata (lib/seo.ts) ZATEN tum alanlari destekliyordu; eksik yalniz editor formuydu | Editore canonical + robots index/follow checkbox + OG title/description; save body tum alanlari yollar. E2E: PATCH -> canonical/robotsIndex dondu |
| **Redirect CRUD admin API + UI** | PDF SEO gereksinimi "Redirect yonetimi"; seed-only idi | `admin-redirects.controller` (GET/POST/PATCH/DELETE; DELETE yalniz ADMIN) + dogrulama (source `/` ile baslar, 301/302) + degisimde Redis `redirects:enabled` dusurulur (proxy in-mem cache <=60sn gecikme — UI'da acikca yazar). `/admin/redirects` sayfasi |
| **Form tanimlama admin'den** | PDF "Form tanimlama"; seed-only idi. Form sistemi field-driven oldugu icin tanim = veri | POST/PATCH `/admin/forms` (key kebab-case, alan adi regex, benzersizlik) + `form-def-editor.tsx` (alan satirlari + sira + enable/disable). E2E: create -> public GET -> submit -> disable -> 404 |
| **Medya tekrar kullanimi: iliski + URL** | "Tekrar kullanim" iki seviye: yapisal (Media FK) ve serbest (blok JSON'daki url) | (1) POST editorunde kapak gorseli secici -> `coverImageId` connect/disconnect (Entry-Media ILISKISI = gercek reuse); (2) medya sayfasinda "URL kopyala" |
| **Ceviri eslestirme UI** | TranslationGroup modeli + hreflang zaten calisiyordu; admin'de gorunmuyordu | `findOne` artik grup kardeslerini dondurur; editor yan panelinde "Ceviriler" (kardese link + durum) + eksik dil icin "cevirisi olustur" = ayni gruba kopya-taslak POST (blok yapisi kopyalanir, metin cevrilir). E2E: grup baglama dogrulandi |
| **Audit log sayfasi** | API (`GET /admin/audit`) Faz 3'ten beri vardi; gorsel yuzu yoktu | `/admin/audit` tablosu (zaman/aksiyon/varlik/meta) + topbar "Denetim" |
| **NestJS modul dersi** | AdminRedirectsController eklenince api crash-loop: JwtAuthGuard'in JwtService'i modul kapsaminda yok | Guard kullanan HER modul `AuthModule` import etmeli (FormsModule kalibi); RedirectsModule'e eklendi |
| **Lint kurali uyumu** | Yeni sayfalar 2 yeni eslint hatasi getirdi (pre-existing 3'e eklenmemeli) | `set-state-in-effect` -> effect'te `Promise.resolve().then(load)`; `window.location.href` atamasi -> `useRouter().push` |

## Editor UX turu — kullanici geri bildirimi (2026-06-10)

| Geri bildirim | Cozum |
|------|-------|
| "Localden de dosya yukleyebileyim" | `media-picker.tsx`: kutuphane gridi + "Bilgisayardan yukle" TEK panelde; kapak ve blok gorselleri ayni bileseni kullanir |
| "Bloklar cok teknik (ham JSON)" | `block-form.tsx`: 16 blok tipinin tamami icin alan tanimlari (FieldSpec) + jenerik renderer (metin/select/link/gorsel-secicili-image/satir-listesi/ic-ice). Varsayilan FORM modu; "JSON" dugmesiyle guc-kullanici moduna gecis (gecersiz JSON'dan form'a gecis engellenir). Alan tanimlari @kron/shared Zod semalarinin UI izdusumu |
| "Kaydet'te geri bildirim yok" | (Aslinda kucuk gri yazi vardi - gozden kacti.) Sag-ust sabit TOAST (yesil/kirmizi, 4sn) + `adminRequest` helper API hata MESAJINI tasir (adminFetch yutuyordu) |
| "Onizleme hep ayni sayfa" | Teshis: link uretimi DOGRUYDU (icerik basina farkli, E2E ile kanitlandi). Iki gercek neden: (1) kullanicinin yeni actigi kayitlar bloksuz -> bos sablon; (2) onizleme KAYDEDILMIS hali gosterir, kaydetmeden Onizle = eski icerik. Cozum: dirty takibi + "Kaydedilmemis degisiklikler var" uyarisi + Onizle'de once-kaydet onayi |
