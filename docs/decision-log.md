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

## Kullanici geri bildirimi turu 2 (2026-06-10) — 7 madde

| Madde | Teshis / Cozum |
|------|-------|
| Zamanlanmis yayin saati 3 saat kayiyor | datetime-local YEREL, gosterim `slice(0,16)` UTC kesiyordu (12:00 sec -> 09:00 gorun). `isoToLocalInput` ile yerel donusum; kayit zaten dogruydu |
| Yeni form listede en altta | `listDefinitions` `key asc` siraliydi -> `createdAt desc` (yeni ustte) |
| Bloksuz icerik onizlemesi bos sayfa | Preview sayfasina bos-durum mesaji: baslik + "Blok ekleyin, burada gorunecek" yonlendirmesi |
| ~15dk sonra logout | Access token TTL 900s, admin istemcisinde YENILEME YOKTU. Cozum: 401'de sessiz refresh (httpOnly cookie, credentials:include — localhost:3000->4000 same-site) + retry; login'e credentials eklendi. Bonus bug: ayni saniyede uretilen refresh token'lar birebir ayni string -> tokenHash unique ihlali (500) -> payload'a rastgele `jti` |
| CONTACT_FORM blogu render edilmiyordu | `dynamic-form.tsx`: FormDefinition'i public API'den ceker, alanlari (select options dahil) render eder + KVKK + honeypot. Artik admin'de tanimlanan HER form bir sayfaya CONTACT_FORM bloguyla eklenip aninda canlida test edilir. LOGO_CLOUD da registry'ye eklendi (eksikti). FormField'a `options[]` (DTO + tanim editorunde virgullu giris) |
| "Gecersiz deger zaten girilemesin, uyari kutuda olsun" | (1) NORMALIZASYON: link/image alanlari her zaman tam string objesi uretir ({label,href}/{url,alt}) -> "href: expected string, received undefined" sinifi hatalar IMKANSIZ; (2) zorunlu alanlar (Zod ile esles) kirmizi cerceve + kutu icinde "Zorunlu alan — bos birakilirsa kaydedilemez" |

## Yeni ozellik paketi (2026-06-10) — kullanici secimi: 8/9/5/11 haric tum liste

| Ozellik | Karar / Nasil |
|------|-------|
| **Temel refactor (blocks-view)** | Salt-gorsel blok bilesenleri + REGISTRY ayri dosyaya cikti. TEK temel, UC tuketici: server render (public), Time Machine surum onizleme (client), gorsel editor canli onizleme (client). "Onizleme uretimle birebir" garantisinin kaynagi |
| **3+4 Time Machine + Diff** | Versiyon altyapisi (snapshot/restore/audit) zaten vardi -> yalniz UI + 1 endpoint (GET version detayi). Diff motoru saf fonksiyon (lib/diff.ts): JSON flatten -> path bazli karsilastirma; blok eslestirme INDEKS bazli (tasima = sil+ekle gorunur — bilincli sadelik, aciklanabilirlik) |
| **10 Command Palette** | Kutuphanesiz fuzzy (ardisik eslesme bonusu); acilista tek seferlik icerik/form/medya indeksi; Ctrl+K global |
| **1 Gorsel Editor (Webflow-lite)** | Tam ekran mod: solda GERCEK bilesenlerle canli onizleme (zoom .62 / mobil 390px), bloga hover=cerceve, tikla=sagda formu; degisiklik ANINDA yansir (ayni React state, sunucu turu yok). Undo/redo: snapshot stack + 700ms birlestirme (tus vurusu basina adim olmaz), Ctrl+Z/Ctrl+Shift+Z. BILINCLI SAPMA: metin contentEditable ile sayfa ustunde degil, yan panelde duzenlenir -> Zod validasyonu + veri butunlugu korunur (contentEditable -> blok verisine geri esleme kirilgan). React compiler dersi: render'da ref okunmaz -> canUndo/canRedo state bayraklari |

## Yeni ozellik paketi 2. yarisi (2026-06-10)

| Ozellik | Karar / Nasil |
|------|-------|
| **2 SSE canli sync** | SSE secimi (WebSocket DEGIL): tek yonlu yayin yeterli, EventSource native auto-reconnect, proxy/CORS dostu. EventsModule global; ContentService 5 noktadan emit (yalniz meta + degisen blok tipleri — optimizasyon). Onizleme sayfasi eslesen slug'da router.refresh() — yenileme yok. Durum noktasi + son olay bilgisi bantta |
| **7 Saglik Denetimi** | AI'siz KURAL TABANLI (deterministik = guvenilir demo): 10 kural (meta desc, baslik uzunlugu, noindex, goreli canonical, ic ice veride alt'siz gorsel, CTA'siz sayfa, urunde FAQ/GEO, RICH_TEXT h1, bloksuz). 11 unit test (apps/api/test — prod tsc disinda). Gercek veride anlamli bulgular (PAM meta 162kr) |
| **13 Onay akisi lite** | REVIEW enum + sunucuda rol zorlamasi (EDITOR PUBLISHED/SCHEDULED yapamaz - 403); UI rol-farkindali (getRole localStorage — yalniz gorunum, gercek yetki sunucuda). editor@kron.local seed kullanicisi. Audit: entry.review-request |
| **6 AI Site Architect** | GUVENLIK MODELI: LLM ciktisindaki her blok validateBlockData'dan (Zod) gecmeden DB'ye yazilamaz — "AI'a sema dayatma" hikayesi. Resmi @anthropic-ai/sdk, claude-opus-4-8, adaptive thinking (claude-api skill referansiyla yazildi). Key yoksa deterministik SABLON modu (demo gunu dis bagimlilik riski sifir); UI rozeti modu gosterir |
| **12 Iliski grafigi** | Kutuphanesiz SVG (tip kolonlari + locale alt-kolonu); kenarlar: blok verisinden regex ile ic linkler (/tr|en/slug) + ceviri gruplari (kesikli). Yetim tespiti (gelen linki olmayan, kirmizi halka). Zoom=viewBox/tekerlek, pan=surukle. NestJS dersi: statik 'graph' yolu ':id' parametreli yoldan ONCE tanimlanmali |

## Degerlendirme turu duzeltmeleri + PDF bosluk kapatma (2026-06-10/11)

| Konu | Karar / Nasil |
|------|-------|
| **Blok galerisi** (kullanici onerisi) | block-catalog.ts: 16 tip icin TR ad + aciklama + ~25 hazir tasarim ornegi; block-picker.tsx iki adimli secici — presetler GERCEK bilesenlerle CANLI mini-onizleme (statik gorsel degil). Iki editorde de ayni galeri |
| **Restore idempotentligi** (kullanici bulgusu) | Ayni surume ikinci restore kopya COGALTIYORDU. contentSignature (kanonik JSON imza) ile karsilastirma; ayniysa yazma yok + alreadyAtVersion doner. Entegrasyon testi eklendi |
| **"Restore etti ama eski sayfa gorunuyor"** | Restore CALISIYORDU; acik editor sekmesi bayatti. Editor artik SSE dinler: disaridan update/restore gelince sessizce tazeler (dirty ise UYARIR, ezmez); kendi olaylari sayacla yutulur (Date.now degil — react-hooks/purity dersi: saf sayac ref'i) |
| **Baseline v1** (kullanici bulgusu) | Seed icerigin surumu yoktu -> ilk edit v1 = SONRASI oluyordu, orijinal kayboluyordu. ensureBaselineSnapshot: ilk degisiklikten once mevcut hal v1 "ilk hal (duzenleme oncesi)" olarak saklanir |
| **next/image gecisi** (PDF: WebP/AVIF + lazy) | Public sitedeki tum buyuk gorseller next/image (otomatik WebP/AVIF dogrulandi, lazy, width/height=CLS korumasi, hero grafigi priority, fill+sizes nerede konteyner-bazli). Kucuk ikonlar raw img+loading=lazy (boyut degisken). Admin paneli raw img KALDI (dahili arac, noindex — bilincli). MinIO host'u remotePatterns ile (S3_PUBLIC_URL'den turetilir) — kullanicinin yukledigi kapak 500 veriyordu, kok neden buydu |
| **Mobil navigasyon** (PDF: responsive) | Mobilde nav tamamen gizliydi (gezinme imkansiz). details/summary tabanli hamburger: JS'siz, erisilebilir, server component'te calisir; gruplu 28 link |
| **OG image** | Kapak gorseli varsa OG/Twitter paylasim gorseli olarak MUTLAK URL ile metadata'ya eklenir |
| **Lint %100** | 3 pre-existing set-state-in-effect kapatildi (Promise.resolve().then(load) kaibi) — artik sifir hata |
| **Test 29/29** | +4 entegrasyon: onay akisi (EDITOR 403/REVIEW/ADMIN publish), redirect validasyon, saglik ucu, restore idempotentligi |
| **PDF Mimari docs** | docs/deployment.md (prod imaj stratejisi, olcekleme — SSE coklu-replika icin Redis pub/sub plani, cron lider kilidi, logging/monitoring hedefi, perf olcumu) + docs/demo-senaryosu.md (12dk akis + olasi soru cevaplari) |

## Guvenlik/bug denetimi turu (2026-06-11) — /cso, "vulnerability degil BUG" cercevesi

Kullanici guvenlik denetimi istedi ama bulgulari guvenlik-acigi dili yerine BUG (yanlis davranan kod) olarak ele almami istedi. Once derin tespit (kod yollari uctan uca izlendi), sonra kullanici onayiyla uygulama. Hepsi gercek API/web uzerinde dogrulandi; testler 34/34, lint temiz.

| Bug | Teshis / Karar / Nasil |
|------|-------|
| **1 — Ham HTML basimi (XSS)** | RICH_TEXT.html + bazi basliklar (HERO/VALUE_PROP/CASE_STUDY/MEDIA_TEXT/TESTIMONIAL) dangerouslySetInnerHTML ile basiliyor; Zod semasi `z.string()` oldugu icin HTML'i SUZMUYOR. Editor/AI ciktisi `<script>`/`<img onerror>` enjekte edebilir. Cozum: `html-sanitize.ts` — BLACKLIST DEGIL WHITELIST: once tum ozel karakterler escape, sonra yalniz izinli etiketler geri acilir (saldirgan etiket escape katmanini gecemez). Basliklar yalniz `<b>`; RICH_TEXT zengin allowlist + `<a href>` sema dogrulamasi (javascript:/data: red). Yazma kapisina (`toBlockCreate` + restore) baglandi — AI yolu da `content.create`'ten gectigi icin kapsanir. "Iki kapi" hikayesi: Zod sema kapisi + sanitize XSS kapisi. +13 birim test. Hand-rolled tercih gerekce: kapsam kucuk + niteliksiz oldugundan escape-then-restore kanitlanabilir guvenli, yeni bagimlilik/Docker imaj rebuild'i gerekmedi |
| **1b — JSON-LD script-breakout** | `JsonLd` JSON.stringify ciktisini script icine basiyor; `</script>` kacisini engellemiyor. Baslik/FAQ editor-duzenlenebilir. Cozum: `<>&` -> `\u00xx` |
| **2 — CSV formul enjeksiyonu** | `forms.service.csvCell` yalniz `",\n` kacisiyordu; `=+-@` ile baslayan public form degeri admin Excel/Sheets'te FORMUL olarak calisir. Cozum: bu karakterlerle (ve tab/CR) baslayan hucreye `'` oneki |
| **3 — Guvenlik basliklari yok** | KESIF: krontech.com'da CSP/HSTS/nosniff/Referrer-Policy VAR (cogu Cloudflare), bizde HIC yok — orijinal site bu konuda ONDEYDI. Cozum: `next.config.ts headers()` — CSP (host'lar env'den: S3_PUBLIC_URL medya + NEXT_PUBLIC_API_URL connect/SSE), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (+prod HSTS). CSP'de script/style 'unsafe-inline' (Next hidrasyonu+Tailwind), dev'de 'unsafe-eval' (HMR) — bilincli; frame-ancestors+object-src 'none' ile clickjacking kapali |
| **4 — CORS fail-open** | `origin: corsOrigin ?? true` — prod'da CORS_ORIGIN unutulursa credentials:true ile HER origin'e reflektif izin. Cozum: env yoksa dev'de yalniz localhost, prod'da fail-closed (NEXT_PUBLIC_SITE_URL veya tamamen kapali) + uyari logu |
| **5 — Upload limit/mime yok** | FileInterceptor limitsiz; ContentType client'in bildirdigi mime'dan. Editor devasa dosya (multer memory) veya .svg/.html yukleyip public bucket'tan servis edebilir. Cozum: 10MB limit + image/* on-eleme + MAGIC-BYTE tip tespiti (gercek icerikten; client mime'a guven yok). SVG bilincli RED (XML+script tasiyabilir) |
| **6 — Secret fallback + token suresiz** | PREVIEW/REVALIDATE secret'lari `?? 'change-me-...'` sabit varsayilana dusuyor; preview token = HMAC(locale,slug) icerik-bagsiz+suresiz. (Iyi: JWT secret'larinda fallback YOKTU.) Cozum: `assertProdSecrets` bootstrap fail-fast (prod'da bos/varsayilan ise acilista HATA) + preview token'a `exp` (PREVIEW_TTL, vars. 2sa) |
| **6b — SSE auth yok** | `/api/events/content` guard'siz; yonetim-ici kanal public. Cozum: `JwtAuthGuard` (zaten httpOnly access_token cookie'sini okuyor — EventSource header gonderemez ama cookie gonderir) + EventsModule AuthModule import + iki EventSource'a `withCredentials`. Anonim baglanamaz; istemci zarif dusus (kirmizi nokta). Canli: oncesi 200 -> sonrasi 401 |
| **Windows dersi** | `nest --watch` bind-mount degisikligini algilamadi; SSE'yi ilk denedigimde 200 dondu (container eski kodu calistiriyordu). `docker compose restart api` ZORUNLU. Deployment notuna eklenecek aday |

## Urun detay 1:1 turu — 5 urun + sekme stub'lari (2026-06-12)

Kullanici: "product detay sayfasi korkunc durumda, orijinal tasarimi aktarir misin" + ana sayfa ilk slide'a orijinal gorsel. Kapsam karari kullanicidan: 5 urun TEK SEFERDE + sekme cubugu 1:1 + stub sayfalar.

| Konu | Karar / Nasil |
|------|-------|
| **Icerik kaynagi** | 10 sayfa (5 urun × en/tr) `scripts/extract-product-pages.py` ile cikarildi (hero/lead/sekmeler/bolumler/testimonial + gorsel URL'leri). Mojibake (™, ı) elle duzeltildi |
| **KESIF: krontech /tr urun sayfalari Ingilizce** | Govde metni cevrilmemis (yalniz nav TR). Bilincli sapma: biz TR'yi GERCEK ceviriyle veriyoruz — CMS cok-dilliligi (TranslationGroup + hreflang) gosteriliyor; "birebir kopya degil dogru CMS" hikayesine uygun |
| **Sekme stub sayfalari** | krontech'te her sekme AYRI sayfa (orn. /kron-pam-key-benefits). 18 stub PAGE entry (×2 dil): ayni urun banner'i + sekme cubugu (ilgili sekme aktif) + kisa RICH_TEXT. Nav'daki olu `kron-pam-resources` linki de boylece cozuldu |
| **Telemetry slug** | `kron-telemetry-pipeline` → `telemetry-pipeline` (krontech gercek URL'i + nav.ts zaten boyleydi → olu link kapandi). Ana sayfa hero/showcase href'leri guncellendi |
| **Banner olcumleri** | `.gradient-header`: 400px, overlay `linear-gradient(270deg, rgba(47,156,255,0), rgba(21,99,255,.75))` op .8, h1 40px/700, lead max-w 530px, 2 beyaz outline buton 48px (hover mavi gradyan). Datasheet butonu krontech'te modal acar — biz /resources'a yonlendirdik (canli demoda olu buton olmasin) |
| **Testimonial tasmasi** | `!overflow-visible` komsu slide'i mavi bandin disina tasiriyordu. Overflow kapatildi; krontech'in `bottom:-80px` pagination'i swiper padding-bottom 80px + section pb 64px olarak yeniden dengelendi (gorsel sonuc ayni: dot'lar icerigin 80px altinda) |
| **Ana sayfa ilk slide** | Pusula SVG mockup yerine krontech orijinali `685x650_kuppinger_logo.png` (18KB) indirildi → `/kron/hero/products/kuppinger-logo.png` |
| **Gorseller** | 33 adet (banner/bolum/testimonial/sekme ikonu) sharp ile display-aware optimize: ~3.9MB → ~1MB (`public/kron/products/`) |

## Blog detay 1:1 turu — phishing yazisi (2026-06-12)

Kullanici krontech'in phishing yazisiyla bizimkini yan yana koydu: "tasarim cok farkli". Iki kok neden: (1) onceki "blog detay yeniden tasarim" KENDI tasarimimizdi (mavi band + tek kolon + Related Posts) — krontech ise beyaz iki-kolon; (2) seed govdesi 1 paragrafti, krontech tam makale + FAQ akordeonu.

| Konu | Karar / Nasil |
|------|-------|
| **Duzen krontech #blog-detail birebir** | col-8 makale (kapak USTTE, h1 32/600, `.blog-terms` 12px tarih, `.blog-socials` 22px paylasim ikonlari — gercek share URL'leri, inline SVG) + col-4 sticky Highlights (liste sayfasindaki widget `blog-shared.tsx`'e cikarilip PAYLASILDI). Mavi band + Related Posts izgarasi kaldirildi |
| **FAQ = collapse-general** | Global FAQ blogu krontech akordeonuna cevrildi (max-w 950, baslik #fbfbfc, 14px/600, chevron; details/summary = JS'siz + FAQPage JSON-LD zaten vardi). Makale altinda tam genislik render |
| **Tam icerik** | EN govde krontech'ten scrape (5 h2 bolum + ic linkler; PSM linki bizde sayfa olmadigindan /kron-pam'a baglandi) + 7 soruluk FAQ; TR govde + FAQ tam ceviri (krontech blogun TR'si yine Ingilizce — ayni bilincli sapma). BLOG_ARCHIVE'a opsiyonel `faq` alani + loop FAQ blok uretimi |
| **TOC atlandi** | krontech makale basinda anchor'li icindekiler var; sanitizer (whitelist, NITELIKSIZ etiket politikasi) h2 id'lerini soyacagi icin anchor'lar calismaz — TOC bilinçli atlandi (sanitizer'i gevsetmeye degmez) |
| **RICH_TEXT_PROSE export** | Makale tipografisi blocks-view'dan export edildi; blog detayinda Container'siz, col-8 genisliginde ayni siniflar (tek kaynak) |
| **Cift breadcrumb fixi** | PRODUCT_TABS'li sayfalar (urun + sekme stub'lari) kendi breadcrumb'ini cizer -> [slug] genel breadcrumb'i tip yerine BLOK varligina gore bastiriyor (stub'lar PAGE tipinde oldugundan tip kontrolu yetmiyordu) |
| **Yazar alani yok** | krontech "May 11, 2026 / Erhan YILMAZ" gosteriyor; modelimizde author alani yok -> yalniz tarih (migration'a degmez; istenirse PostDetail.author eklenir) |

## Bug fix turu — POST'ta editor HERO'su kayboluyor (2026-06-12, kullanici bulgusu)

Kullanici admin'den POST olusturup HERO template (baslik + butonlar + bilgisayardan GIF) ekledi, review->publish etti; yayinda hero gorunmedi. Uc ayri kok neden + bir operasyonel hata:

| Konu | Teshis / Cozum |
|------|-------|
| **POST sayfasi TUM HERO'lari atiyordu** | Seed'in yalniz-baslik HERO'su makale basligini ciftledigi icin filtre konmustu; editorun GERCEK icerikli HERO'su da sessizce yutuluyordu. Cozum: `isMeaningfulHero` — gorsel/grafik/altbaslik/CTA/buton/slide tasiyan HERO makale ustunde render edilir; yalniz-baslik HERO atlanmaya devam (cift h1 olmasin) |
| **Preview/publish tutarsizligi** | Preview `Blocks`'u dogrudan basiyordu (HERO gorunur), public POST sayfasi atiyordu -> "preview'da var, yayinda yok". Cozum: POST govdesi `post-article.tsx`'e cikarildi; public sayfa VE preview AYNI bileseni kullanir |
| **Tekli HERO zemini hardcoded** | `blocks-view` tekli hero `/hero-bg.png`'yi sabitleyip `data.image`'i yok sayiyordu (carousel dogruydu). Cozum: `image?.url ?? '/hero-bg.png'` (carousel ile ayni desen); HERO semasina top-level `graphic` da eklendi (zod bilinmeyen alani soyuyordu) |
| **OPERASYONEL HATA (benim)** | Blog turundaki `prisma migrate reset` kullanicinin elle olusturdugu post+medyayi SILDI (audit log bos, 13:26 sonrasi kayit yok). Ders: kullanici canli test yapiyorken reseed SORMADAN yapilmaz; demo oncesi de gecerli |

E2E dogrulama (reseed'siz, gercek akis): login -> GIF upload (magic-byte image/gif kabul) -> HERO'lu (variant=product, gif zemin, 2 buton) + RICH_TEXT'li POST create -> publish -> public sayfada hero/gif/butonlar/govde OK + preview birebir ayni; test verisi API'den DELETE ile temizlendi.

NOT (kullaniciya aciklama): blog liste/anasayfa karti gorseli HERO'dan degil entry'nin **Kapak (coverImage)** alanindan gelir — kartta gorsel istenirse editorde Kapak secilmeli.

## Bug fix — yuklenen medya kapaklari kirik: next/image split-horizon (2026-06-12, kullanici bulgusu)

Kullanici GIF'i Kapak olarak secti; blog listesi + Highlights'ta gorsel KIRIK cikti. Kok neden: medya URL'leri mutlak `http://localhost:9000/...` idi — tarayici erisir AMA `next/image` optimizer gorseli WEB CONTAINER ICINDEN fetch eder; orada localhost=web container'i, MinIO degil (split-horizon). HERO zemini CSS background oldugu (tarayici dogrudan yukledigi) icin ayni GIF orada calisiyor, kapakta calismiyordu — yaniltici belirti.

| Karar | Nasil |
|------|-------|
| **Tek origin: goreli /media tabani** | API artik `/media/<key>` uretir (S3_PUBLIC_URL varsayilani `/media`); web `rewrites()` ile `/media/:path*` -> `S3_INTERNAL_URL/bucket/:path*` (minio:9000) proxy'ler. Tarayici VE optimizer ayni kapidan gecer |
| **Prod yolu korunur** | S3_PUBLIC_URL'e mutlak CDN/S3 girilirse eski davranis: URL mutlak, remotePatterns + CSP origin otomatik, rewrite devre disi |
| **Env degisikligi** | .env/.env.example: S3_PUBLIC_URL=/media + S3_INTERNAL_URL (docker disi dev icin http://localhost:9000 notu). Hatirlatma: env degisikligi `restart` ile degil `up -d` ile uygulanir |

E2E: GIF upload -> url `/media/uploads/...` -> dogrudan GET 200 + `/_next/image` 200 (onceden kirik) -> kapakli post publish -> blog listesi + sidebar'da gorsel OK; testler 8+38 yesil. NOT: kullanicinin gordugu "ABC" karti reseed'le silinmis icerigin BAYAT ISR render'iydi (hayalet); revalidate ile kendiliginden gider.

## Teslim oncesi eksik kapatma turu (2026-06-12)

Tum gereksinimler odev metnine karsi yeniden tarandi; tespit edilen eksikler kapatildi.

| Eksik | Cozum |
|------|-------|
| **Nav/footer'da 30 olu link** (cozumler, sektorler, hakkimizda, legal, 7 urun) | Data-driven `STATIC_PAGES` seed: 30 sayfa x2 dil, kisa ama gercekci icerik. Urun olanlar (Cloud PAM, Password Vault, PSM, MFA, IPDR, NPM, QA) PRODUCT tipi (Product JSON-LD + tagline + urun banner'i + Demo CTA); digerleri PAGE (koyu hero + RICH_TEXT). Sonuc: 39 slug x 2 dil = 78 URL'de SIFIR olu link; sitemap 84 -> 146 |
| **Kaynaklar sayfasi hardcoded** ("tum icerikler yonetilebilir" geregi) | Yeni `RESOURCE_HUB` blok tipi (shared Zod + Prisma enum MIGRATION `resource_hub_block` + bilesen + admin katalog/form girisleri). Sayfa artik 'resources' PAGE entry'sinden render edilir; entry yoksa ayni gorunumlu statik yedege duser. Tasarim birebir korundu (FEATURE_GRID'e cevirmek geriletirdi) |
| **Resources kartlarindaki 2 olu hedef** | case-studies + kron-pam-resources stub'lari artik var -> kartlar tiklanir (CMS verisi + yedek statikte) |
| **seo.test.ts 2 pre-existing tip hatasi** | PublicEntry'de olmayan localeCode kaldirildi + BlockNode.order eklendi -> web tsc %100 temiz |
| **Onceden kapali sanilanlar dogrulandi** | Admin redirect CRUD zaten varmis (admin-redirects.controller + /admin/redirects). Swagger 200, rate-limit basliklari, OG etiketleri, URL-koruma/SEO-kayip stratejisi docs'ta mevcut |

Prisma generate notu (Windows): `src/generated` container-local volume — container'da generate host'a YANSIMAZ; host tsc icin host'ta da `npx prisma generate` calistir. Dogrulama: 78 URL 200, testler 38+15+8 yesil, reseed KULLANICI ONAYIYLA yapildi.

## Admin paneli yeniden muhendislik denetimi (2026-06-25) — /plan-eng-review

Ikinci tur eng-review: mevcut admin panel kodu (16 sayfa + 9 bilesen) mimari / kod-kalitesi /
test / performans acisindan yeniden tarandi. Asagidakiler bu turda ALINAN KARARLAR.
**Durum: TUM kararlar UYGULANDI ve commit'lendi** — A1/A2/C3/C5 (Serit A) + BFCache sertlestirme +
**C2** (editor bolme, commit `85f844a`) + **T1** (testler + Playwright, commit `a4042db`) + P1/C4/mid-edit
guard/jest. Branch `eng-review-admin-hardening`. Acik kalan: yalniz CSRF (Faz 9, gerekceli) +
menude secilmeyen 4 ozellik (kapsam disi). Detaylar asagida.

| Konu | Teshis / Karar / Nasil |
|------|-------|
| **KESIF — ADR 0003 ↔ kod celiskisi** | ADR 0003 madde 2: "localStorage + Bearer (XSS riski) → **Reddedildi**" diyor; ama `lib/admin.ts:6` accessToken'i `localStorage`'da (`kron_admin_token`) tutuyor. Gerekce kod yorumunda var (cross-origin web:3000→api:4000, SameSite=Lax cookie dev'de gonderilmiyor → login body'deki accessToken Bearer ile kullaniliyor). refresh_token httpOnly cookie'de (ADR'ye uygun). Yani **access token saklama ADR'nin reddettigi alternatife kaymis** — bilincli ama ADR'ye yansimamis sapma. A2 karari bunu ADR'ye geri hizalar. |
| **A1 — Auth guard tekrari (DRY)** | 13 admin sayfasi `if(!getToken()) redirect`'i kendi `useEffect`'inde tekrarliyor (iki varyant); `admin/layout.tsx`'te guard YOK, middleware YOK → korumali shell once render olur, sonra login'e atilir (veri sizmaz: fetch token ister; ama FOUC + kirilganlik + DRY ihlali). KARAR: **paylasilan `useAdminGuard()` hook** (layout/sayfa seviyesinde tek yer). Next middleware secilMEDI: token client-side localStorage'da, server middleware onu goremez. Gercek yetki zaten sunucuda (JwtAuthGuard + RolesGuard); bu salt UX/DRY duzeltmesi. |
| **A2 — accessToken saklama yeri** | localStorage XSS'e acik (kalici token hirsizligi). KARAR: **in-memory token (JS degiskeni) + sayfa yenilemede sessiz refresh** (httpOnly refresh cookie zaten var, `tryRefresh` mevcut). XSS token'i kalici calamaz; **ADR 0003'un httpOnly / no-localStorage niyetine geri hizalanir**. Maliyet: her sekme/yenilemede bir refresh cagrisi (kabul edildi). TAKIP: A2 uygulaninca **ADR 0003 "Sonuclar" bolumu guncellenmeli** (access token tasima = in-memory; cross-origin dev gercegi not edilmeli). |

### Kod kalitesi / test / performans kararlari (ayni tur)

| Konu | Teshis / Karar / Nasil |
|------|-------|
| **C2 — God component** | `entries/[id]/page.tsx` = 1222 satir, tek bilesen, ~10 sorumluluk (entry-meta, bloklar, SEO, health, AI 3-tab, ceviriler, versiyonlar, SSE sync, visual-mode, toast, cover). KARAR: **hedefli bolme** — en sismis 4 parca (AI Asistani paneli, SEO formu, Saglik Denetimi, SSE sync hook'u) ayri dosya/hook'a; cekirdek editor ~400 satira iner. Davranis AYNI (salt yapisal). "Make the change easy" — sonradan test de kolaylasir. Tam parcalama (10 parca) teslime yakin over-engineering diye REDDEDILDI. |
| **C3 — Sessiz hata yutma** | `adminFetch` hata da olsa bos da olsa `null` donuyor; dashboard/media/redirects API coktugunde sessizce BOS tablo ("hic icerik yok" gibi) gosteriyor — kullanici "coktu" ile "veri yok"u ayiramiyor. KARAR: **adminFetch hata/bos ayrimi + liste sayfalarinda hata-UI** ("Yuklenemedi, tekrar dene"). Acik > kapali. |
| **C5 — Helper boilerplate (DRY)** | `adminFetch` / `adminRequest` / `adminUpload` ayni 401→refresh→retry→redirect blogunu 3 kez kopyaliyor. KARAR: tek `rawFetch`'e cikar (C3 ile ayni dokunusta — ayni dosya). |
| **T1 — Admin frontend 0 test** | API zaten 34/34 E2E; web admin'de SIFIR test (vitest kurulu, yalniz `lib/`). KARAR (tam kapsam): **(a)** saf-fn birim testleri — `isoToLocalInput` (timezone, gecmiste bug cikti), `fuzzyScore`, `save()` JSON-parse; **(b)** `adminFetch` 401→refresh akisi (mock fetch); **(c)** Playwright E2E: login → icerik olustur → kaydet → yayinla. "Too many tests > too few" tercihine uygun. |
| **P1 — Command palette her acilista re-fetch** | Her Ctrl+K'da 3 paralel istek (entries pageSize=100 + forms + media). KARAR: **ilk acilista cache'le** (oturum boyu) + kucuk yenile/TTL (yeni icerik bayatlamasin). |
| **C4 — SSE suppress sayaci (NOT)** | `entries/[id]/page.tsx:186-213` kendi yazma olayini yutmak icin sayac; cok-sekme/hata halinde drift edebilir (confidence 7, edge-case, demo riski dusuk). Karar verilmedi → TODOS adayi (bkz. asagi). |

### Uygulama durumu (Serit A — UYGULANDI, 2026-06-25)

Kullanici karari: once Serit A (lib/admin.ts merkezli, en az cakisma). **A1 + A2 + C3 + C5 uygulandi.**

- **A2 (in-memory token):** `lib/admin.ts` accessToken artik modul degiskeninde; localStorage tamamen
  kaldirildi. Rol JWT payload'indan cozulur (`getRole`). `ensureSession()` eklendi: token yoksa
  refresh cookie ile sessizce geri al. **Regresyon yakalandi + duzeltildi:** eski `logout()` yalniz
  yerel token siliyordu → in-memory + mount-refresh ile refresh cookie kalinca reload'da geri
  girilebiliyordu; `logout()` artik `/api/auth/logout` cagirip refresh token revoke + cookie temizler.
- **A1 (useAdminGuard):** `lib/use-admin-guard.ts` — 13 sayfadaki `if(!getToken()) redirect` tek
  hook'a indi. Async: token yoksa once refresh, olmazsa login. 13/13 sayfa hook kullaniyor; geriye
  yalniz 3 merkezi redirect noktasi kaldi (rawAdminFetch 401, logout, hook).
- **C5 (rawAdminFetch):** uc helper'in 401→refresh→retry→redirect blogu tek `rawAdminFetch`'te;
  `adminFetch` artik `adminRequest` uzerine ince sarmalayici.
- **C3 (hata/bos ayrimi):** `adminRequest` hata ile bosu ayirir; paylasilan `LoadError` bileseni
  (components/admin/load-error.tsx) ile **7 liste sayfasi** (icerikler, medya, yonlendirmeler,
  formlar, denetim, grafik, form-gonderimleri) cokunce sessiz bos tablo yerine "Yuklenemedi —
  tekrar dene" gosterir.
- **Dogrulama:** `tsc --noEmit` temiz · `eslint` temiz · vitest **15/15** yesil.

**Degisen / yeni dosyalar (Serit A):**
- `apps/web/src/lib/admin.ts` — YENIDEN YAZILDI: in-memory accessToken (localStorage kaldirildi),
  `getRole` JWT decode, `ensureSession`, `rawAdminFetch` (tek dusuk-seviye fetch), `adminRequest`
  hata/bos ayrimi, `adminFetch` ince sarmalayici, `logout` sunucu revoke.
- `apps/web/src/lib/use-admin-guard.ts` — YENI: async auth guard hook (A1).
- `apps/web/src/components/admin/load-error.tsx` — YENI: paylasilan yukleme-hatasi kutusu (C3).
- 13 admin sayfasi guncellendi: guard `useAdminGuard`'a tasindi; 7 liste sayfasina hata-UI eklendi
  (`page.tsx`, `media`, `redirects`, `forms`, `audit`, `graph`, `forms/[key]`), kalan 6'sinda
  guard-only swap (`architect`, `entries/new`, `forms/new`, `forms/[key]/edit`, `entries/[id]`,
  `entries/[id]/history`).
- `docs/adr/0003-auth.md` — "Guncelleme (2026-06-25)" notu: istemci in-memory token, celiski kapatildi.

**Race / BFCache sertlestirme (init-sira denetimi sonrasi, 2026-06-25):**
In-memory token modeli auth init sirasini degistirdi; CommandPalette + IdleLogout `getToken()`
kullaniyordu — denetlendi:
- **IdleLogout:** first-render race YOK — `getToken()` yalniz 15dk `setTimeout` callback'inde okunur
  (o ana kadar `ensureSession` coktan biter). Degisiklik gerekmedi.
- **CommandPalette:** hard reload sonrasi token bellege gelmeden Ctrl+K dar false-negative penceresi
  vardi (fail-closed ama palette acilmiyordu). FIX: token yoksa once `ensureSession()` beklenir
  (`command-palette.tsx`). Yetkisize hala acilmaz.
- **BFCache back-button stale token (asil bulgu):** `logout` refresh token'i revoke eder ama access
  JWT stateless (~15dk gecerli). BFCache, logout sonrasi back-button'da `/admin`'i heap'iyle geri
  yukleyip eski in-memory token'i canlandirabiliyordu (React effect yeniden calismaz). FIX:
  `admin.ts` `revalidateSession()` (token'a guvenmez, zorla refresh) + `use-admin-guard.ts`'e
  `pageshow`+`persisted` dinleyici; refresh cookie yoksa login'e atar. localStorage modelinde
  ortuk olan emniyetin in-memory'de yeniden kurulmasi. (`command-palette.tsx`, `admin.ts`,
  `use-admin-guard.ts` guncellendi; tsc/eslint temiz, vitest 15/15.)

**Uygulama durumu (C2 — UYGULANDI, 2026-06-25):** Entry editor god-component'i hedefli bolundu —
davranis birebir AYNI (salt yapisal), tsc/eslint temiz, vitest 15/15:
- `lib/use-entry-sse.ts` — YENI: SSE sync + kendi-yazma yutma hook'u (markOwnWrite/rollbackOwnWrite).
- `components/admin/entry-health-panel.tsx` — YENI: Saglik Denetimi paneli (kendi state'i).
- `components/admin/entry-seo-form.tsx` — YENI: SEO formu (sunumsal; seo + onChange).
- `components/admin/entry-ai-assistant.tsx` — YENI: AI Asistani (SEO/okunurluk/ceviri + ilerleme
  cubugu, kendi state'i; onApplyMeta + onSaveBeforeTranslate ile editore baglanir).
- `app/admin/entries/[id]/page.tsx` — bu 4 parca cikarildi: **1222 → 693 satir (%43 azalma)**.
  Cekirdek artik entry-meta + bloklar + visual-mode + kaydet/onizle/restore + ceviriler/versiyonlar.
  (Hedef "~400 satir" idi; 693 gercek sonuc — geri kalan cekirdek tek sorumluluk grubu, parcalanmadi.)

### Kalan is paketi — UYGULANDI (2026-06-25, kullanici "hepsini implemente edelim" dedi)

Sapmalar (BILINCLI SAPMA) ve menude secilmeyen 4 ozellik disindaki bekleyen tum is yapildi.
tsc/eslint temiz, vitest **28/28** (onceki 15 + 13 yeni).

- **P1 — Command palette index cache:** `command-palette.tsx` her Ctrl+K'da 3 istek atmiyor; oturum
  boyu cache + 60sn TTL (`lastIndexAt` ref, `loadIndex(force?)`).
- **Mid-edit guard (kritik TODO KAPANDI):** `entries/[id]/page.tsx` dirty iken `beforeunload` uyarisi
  — 401-redirect / sekme-kapatma / yenileme oncesi kayitsiz is kaybini onler.
- **C4 (TODO KAPANDI) — SSE suppress sertlestirme:** `use-entry-sse.ts` sayac yerine ZAMAN-PENCERELI
  kuyruk (5sn); eskimis own-write damgalari budanir → cok-sekme/hata drift'i kendiliginden duzelir.
- **T1 — testler:** saf fonksiyonlar lib'e cikarildi (`lib/fuzzy.ts`, `lib/datetime.ts`) + test
  (`test/fuzzy.test.ts` 5, `test/datetime.test.ts` 3); `test/admin-auth.test.ts` (5): adminFetch
  401→refresh→retry + adminRequest hata/bos ayrimi (fetch mock). `admin.ts` `window.setTimeout`→
  `setTimeout` (node-test edilebilir + dogru). **Playwright E2E** (`e2e/admin.spec.ts` +
  `e2e/playwright.config.ts`): login→olustur→kaydet→yayinla + reload-oturum-korunur +
  logout-back-button. `e2e/` kok tsc/eslint/vitest kapsami DISINDA (tsconfig exclude + eslint
  globalIgnores) → yesil build'i kirmaz. `package.json`: `test:e2e` script + `@playwright/test` devDep.
  **CANLI KOSULDU (Docker stack): 3/3 GECTI** (14.9s) — bkz. asagidaki Canli QA.
- **jest temizligi:** `apps/api/package.json`'dan kullanilmayan `jest`/`ts-jest`/`@types/jest` cikarildi
  (vitest'e gecilmisti; api'de jest kullanimi yok — dogrulandi).
- **CSRF (ADR 0003 Faz 9) — gerekceyle ERTELENDI (uygulanmadi):** Klasik CSRF cookie-otomatik isteklere
  etki eder; admin mutasyonlari **in-memory Bearer** ile gider (saldirgan okuyamaz) ve API cookie'leri
  **SameSite=Lax** — Lax cross-site POST/PATCH/DELETE'te gonderilmez, mutasyon uclari zaten korunur.
  CSRF token defense-in-depth olurdu ama gercek vektor zaten kapali → marjinal guvenlik icin gereksiz
  karmasiklik. Faz 9 (uretim sertlestirme) notu olarak kaliyor.

**Menude secilmeyen 4 ozellik — KURTARILDI (transcript `7653f47a`, 2026-06-10 menusu).** 13 maddelik
"yeni ozellik" menusunden kullanicinin secmedigi 4 (5/8/9/11), AI'nin o gun "Onermiyorum" dedigi 4
ile AYNI — yani bilincli over-engineering/dusuk-deger elemeleri:
- **5 = AI Assistant** (acik uclu "her seyi yapan" asistan): kapsam patlamasi; #6 AI Architect +
  editordeki AI Asistani paneli (SEO/okunurluk/ceviri) pratikte karsiliyor. KAPSAM DISI.
- **8 = Heatmap** (tiklama isi haritasi): gercek trafik yok → sahte veriyle ici bos; toplama
  altyapisi maliyetli. Deger/maliyet EN KOTU madde. KAPSAM DISI.
- **9 = Multiplayer** (Figma-tarzi es-zamanli ortak duzenleme, CRDT/locking): haftalar surer,
  yarim kalirsa kirilgan; SSE canli-sync (#2) hafif karsiligi var. "Bilincli kapsam disi" daha guclu. KAPSAM DISI.
- **11 = Marketplace** (sablon/blok pazari): blok galerisi + ~25 preset (#1 icinde) pratik degeri
  zaten veriyor; ayri marketplace sisirme. KAPSAM DISI.
Yapilanlar 1/2/3/4/6/7/10/12/13 (git log ile dogrulandi). Sonuc: 4'u de over-engineering/dusuk-getiri,
3'u (5/9/11) yaptiklarimizla KISMEN kapsaniyor → bilincli kapsam disi kaliyor (mulakat hikayesi:
"neyi YAPMADIK ve neden").

**Acik kalan (kapali-by-design disinda):** yalniz CSRF (Faz 9, yukarida gerekceli) + 4 hatirlanamayan ozellik.

### Canli QA (Docker stack, 2026-06-25)

Kullanici stack'i `docker compose` ile ayaga kaldirdi; degisiklikler canli dogrulandi.

- **API auth sozlesmesi (curl):** login 201 (accessToken 229kr + access/refresh cookie) · Bearer ile
  `GET /api/admin/entries` 200 · tokensiz 401 · refresh 201 · logout `{success:true}` · **logout
  SONRASI refresh 401** (= `logout` fix + BFCache `revalidateSession` temeli kanitlandi). JWT payload
  `role:"ADMIN"` icerir → `getRole` in-memory decode'u gercek token'la calisir (A2).
- **Playwright E2E (chromium, canli web:3000): 3/3 GECTI** —
  (1) login → yeni icerik → kaydet → **yayinla** (C2 sonrasi editor akisi + cikarilan paneller saglam);
  (2) reload sonrasi oturum korunur **+ `localStorage.kron_admin_token` == null** (A2 canli kanit);
  (3) logout → back-button → `/admin/login` (BFCache stale token kapandi).
- Secici duzeltmeleri (canli DOM): login butonu ASCII "Giris Yap"; yeni-icerik Baslik/Slug
  placeholder ile bulunur (label htmlFor yok). `test-results/` .gitignore'a eklendi.
- NOT: create testi her kosuda bir yayinli "E2E Test İçeriği" PAGE birakir (zararsiz test verisi).
