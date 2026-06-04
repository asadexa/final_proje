# Site Analizi — krontech.com

> Faz 1 ciktisi. Kaynak: krontech.com canli site analizi (2026-06).
> Amac: sayfa tipleri, icerik tipleri, tekrarlayan bilesenler, cok dilli yapi ve SEO
> alanlarini cikarip icerik modelini bu analize dayandirmak.

## 1. Sayfa tipi envanteri

| Sayfa tipi | Ornek URL | Yapisi | Bizim kapsam (6) |
|------------|-----------|--------|:---:|
| Ana sayfa | `/home`, `/tr/anasayfa` | Kompozit (bloklardan olusur) | ✅ |
| Urun detay | `/kron-pam`, `/cloudpam`, `/password-vault` (~16 urun) | Yari-yapili + bloklu govde | ✅ |
| Cozum sayfasi | `/zero-trust-and-least-privilege` (~14) | Urun detayina benzer | ⬜ (ayni modelle karsilanir) |
| Blog liste | `/blog` | Liste/grid + sayfalama | ✅ |
| Blog detay | `/enhancing-log-routing-...` (flat kok slug) | Makale + bloklu zengin icerik | ✅ |
| Kaynaklar | `/kron-pam-resources`, `/cybersecurity-resources`, `/case-studies`, `/podcast` | Filtrelenebilir kaynak listesi | ✅ |
| Iletisim / Demo | `/contact` | Form + onay alanlari | ✅ |
| Kurumsal | `/about-us`, `/management`, `/newsroom` ... | Generic page (bloklu) | ⬜ (Page modeli) |

## 2. URL yapisi gozlemi (mimari acidan kritik)

- **Flat kok slug:** Urun, cozum ve blog yazilari **kok seviyede** flat slug ile sunulur
  (orn. `/kron-pam`, `/enhancing-log-routing-...`). `/products/...` veya `/blog/<slug>`
  gibi nesting **yok**.
- **Dil:** Canli sitede TR `/tr` onekli, EN buyuk olcude oneksiz (`/home`). Bizim
  rebuild'de odeve uygun olarak **temiz `/tr` ve `/en` oneki** uygulanacak.
- **Sonuc:** Tek bir **slug -> icerik cozumleyici** gerekiyor (tur fark etmeksizin). Bu,
  asagidaki "tek Entry tablosu" tasarimini guclu sekilde gerekcelendirir.
- **URL koruma (Faz 5):** Mevcut flat slug'lar `Entry.slug` olarak **birebir** korunacak;
  eski -> yeni esleme gereken durumlar icin `Redirect` tablosu (301).

## 3. Icerik tipi envanteri

| Icerik | Onemli alanlar |
|--------|----------------|
| **Sayfa (Page)** | Kompozit, bloklu: ana sayfa, kaynaklar, iletisim, kurumsal |
| **Urun (Product)** | Ad, ozet, kategori (PAM / Veri Guvenligi / Telco / Altyapi), ozellikler, bloklu govde, iliskili kaynaklar |
| **Blog yazisi (Post)** | Baslik, ozet, govde (blok), yazar, kategori/etiket, kapak gorseli, yayin tarihi |
| **Medya (Media)** | Gorsel + PDF (datasheet, case study); yeniden kullanilabilir |
| **Form** | Demo talep, iletisim (+ KVKK onayi) |
| **Taksonomi** | Urun kategorisi, blog kategorisi/etiket |

## 4. Tekrarlayan bilesen envanteri  ->  `BlockType`

Ana sayfa ve tipik urun/blog sayfalarindan cikarilan, yeniden kullanilabilir bloklar:

| Bilesen | Kaynak (ornek) | `BlockType` |
|---------|----------------|-------------|
| Duyuru / CTA bandi | "Telemetry Pipeline Webinar" banner | `CTA_BANNER` |
| Hero | "KuppingerCole Leader" hero | `HERO` |
| Bolum basligi | "Globally Recognized Portfolio" | `SECTION_HEADING` |
| Ozellik kart grid'i | 6 urun ozellik karti | `FEATURE_GRID` |
| Urun showcase (genisleyen) | "Kron Products" | `PRODUCT_SHOWCASE` |
| Deger onermesi | "Why Kron?" | `VALUE_PROP` |
| Istatistik bandi | "6 kita, 35+ ulke, 200+ partner, 1500+ kurulum" | `STATS` |
| Vaka calismasi vurgusu | Bank case study | `CASE_STUDY` |
| Blog karuseli | Son 12 yazi | `BLOG_CAROUSEL` |
| Iletisim formu | Ana sayfa alt form | `CONTACT_FORM` |
| SSS (GEO icin) | — | `FAQ` |
| Zengin metin / Medya+Metin / Logo cloud | govde, partner/odul | `RICH_TEXT`, `MEDIA_TEXT`, `LOGO_CLOUD` |

> Bloklar `type + order + data(JSON)` ile saklanir; her tip icin `packages/shared` icinde
> bir Zod semasi -> editorde tipli form, render'da tipli okuma (no `any`). Yeni blok tipi
> eklemek = enum + sema + render bileseni (migration yok). Bu "genisletilebilirlik" demek.

## 5. Cok dilli yapi

- Iki dil: **TR, EN**. Icerik dile gore **yapisal olarak farklilasabilir** (TR sayfasi farkli
  bloklara/urunlere sahip olabilir, hatta bir icerik yalnizca tek dilde olabilir).
- Model: her icerik kaydi bir **locale**'e ait; ceviriler bir **TranslationGroup** ile
  eslesir. Boylece: hreflang uretimi, admin'de "icerik eslestirme", kismi ceviri destegi.

## 6. SEO alanlari (gozlem)

- Sayfa basina: **title, meta description, canonical, robots (index/follow), Open Graph,
  hreflang**.
- Site geneli: **dinamik sitemap, robots.txt, redirect yonetimi**.
- **GEO:** schema.org (Organization, Product, Article, FAQPage, BreadcrumbList), semantik
  HTML, anlamli icerik bloklari, FAQ.

## 7. Beklenen cikti — Icerik modeli (ozet)

Detayli ER + Prisma semasi: [`content-model.md`](content-model.md) (Faz 1 ikinci adim).
Cekirdek fikir: **tek `Entry` tablosu** (PAGE / PRODUCT / POST) ortak alanlari (locale,
group, slug, status, publishAt, SEO, bloklar) tasir; tur-ozel alanlar 1:1 detay
tablolarinda (ProductDetail, PostDetail). Bu sayede flat URL'ler tek noktadan cozulur ve
yayin/SEO/i18n/blok mantigi tek yerde toplanir.
