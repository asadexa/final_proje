# ADR 0001 — Teknoloji Yigini Kararlari

- **Durum:** Kabul edildi
- **Tarih:** 2026-06-04
- **Karar verenler:** Proje sahibi + AI

## Baglam

krontech.com (Kron Technologies — kurumsal siber guvenlik/telekom) sitesini, tasarimi
korunarak; yonetilebilir, olceklenebilir bir **headless CMS** olarak yeniden gelistiriyoruz.
Frontend **zorunlu olarak** Next.js + TypeScript. Odev; backend framework'u, API stili,
kimlik dogrulama ve test framework'u secimlerinin **gerekcelendirilmesini** istiyor.
Bu ADR bu dort karari ve ikincil kararlari kayda gecirir.

---

## Karar 1 — Backend: **NestJS** (Spring Boot yerine)

**Karar:** Backend NestJS (Node.js, TypeScript) ile yazilacak.

**Gerekce:**
- **Tek dil, uctan uca TypeScript.** Frontend zorunlu olarak TS. NestJS ile tum sistem tek
  dil; enum/DTO/validasyon semalari `packages/shared` uzerinden frontend ile paylasilabilir.
  Tek zihinsel model, daha az baglam degisimi, daha hizli iterasyon.
- **First-class altyapi.** Swagger (`@nestjs/swagger`), validation (`ValidationPipe` + DTO),
  yetkilendirme (Guards), cache (Interceptors), rate limit (`@nestjs/throttler`) ve kuyruk
  (`@nestjs/bullmq`) NestJS ekosisteminde hazir gelir — odevin tum gereksinimleri birebir.
- **Moduler mimari.** DI + modul yapisi, CMS gibi cok-modullu (auth/content/media/seo/forms)
  bir sistemde temiz sinirlar saglar; uzun vadede surdurulebilir.

**Degerlendirilen alternatif — Spring Boot:** Olgun, kurumsal Java ekosistemi; CPU-yogun
isler ve cok buyuk ekipler icin guclu. **Reddedilme nedeni:** dili boler (Java vs TS),
frontend ile tip paylasimi yok, tek kisilik bir take-home'da iterasyon daha yavas,
ekstra build/runtime karmasikligi.

**Sonuclar / dikkat:** Node tek-thread; CPU-yogun isler (orn. goruntu isleme) gerekirse
worker/queue'ya tasinmali. Bunu zaten zamanlanmis yayin icin BullMQ ile cozuyoruz.

---

## Karar 2 — API stili: **REST + OpenAPI/Swagger** (GraphQL yerine)

**Karar:** API REST olacak, OpenAPI/Swagger ile dokumante edilecek.

**Gerekce:**
- Odev **Swagger/OpenAPI dokumantasyonu istiyor** — REST ile birebir dogal uyum.
- **Cache & rate-limit basit.** HTTP semantigi (GET cache'lenebilir, ETag, CDN) ve
  endpoint-bazli throttling REST'te dogrudan uygulanir.
- **Iki tuketici de basit.** Hem public site (SSR/ISR fetch) hem admin paneli icin
  ongorulebilir, versiyonlanabilir endpoint'ler.

**Degerlendirilen alternatif — GraphQL:** CMS icin cazip — istemci her sayfada tam ihtiyaci
olan bloklari tek istekte ceker, over/under-fetching azalir. **Reddedilme nedeni:** cache ve
rate-limit belirgin sekilde zorlasir, Swagger dogal degil (ayri schema/introspection),
kurulum maliyeti tek kisilik kapsamda gereksiz.

**Sonuclar / dikkat:** Over-fetching riskini azaltmak icin liste endpoint'lerinde alan
secimi (`?fields=`) ve sayfalama uygulanacak.

---

## Karar 3 — Kimlik dogrulama: **JWT (access + refresh) + RBAC**

**Karar:** Kisa omurlu **access token** + rotasyonlu **refresh token**; roller `admin` ve
`editor` (RBAC), NestJS Guard'lari ile.

**Gerekce:**
- **Stateless & olceklenebilir.** Her API node'u token'i bagimsiz dogrular; yatay olcekleme
  icin paylasimli oturum deposu sart degil.
- Odevin **onerdigi yaklasim JWT**. Access token kisa omurlu (15 dk) tutulur; refresh ile
  sessiz yenilenir, refresh rotation + Redis denylist ile calinan token iptal edilebilir.
- Rol bazli yetki: `editor` icerik yazar/duzenler; `admin` ek olarak kullanici/rol ve
  silme yetkilerine sahip.

**Degerlendirilen alternatif — Sunucu oturumu (Redis session):** Aninda iptal kolay; ama
stateful (her node Redis'e bagimli) ve odevin JWT onerisinden sapar.

**Sonuclar / dikkat:** JWT'nin "aninda iptal edilemez" zayifligini **kisa access TTL +
refresh denylist** ile telafi ediyoruz. Token'lar admin panelinde httpOnly cookie'de
tutulacak (XSS'e karsi).

---

## Karar 4 — Test: **Vitest + Supertest** (Jest yerine)

**Karar:** Unit testler **Vitest**; kritik API endpoint'leri icin **Supertest** ile
integration testleri.

**Gerekce:**
- **Hiz & tek arac.** Vitest, esbuild/Vite tabanli — Jest'ten belirgin hizli, ESM-native,
  watch modu cok hizli. Hem frontend hem backend'de ayni arac → tek konfigurasyon zihni.
- **Jest-uyumlu API** (describe/it/expect) — ogrenme egrisi yok, tasima kolay.
- **Supertest**, NestJS HTTP katmanini gercek istekle (kara kutu) test etmek icin standart.

**Degerlendirilen alternatif — Jest:** NestJS varsayilani, cok oturmus, genis dokumantasyon.
**Reddedilme nedeni:** daha yavas, ESM'de surtunme; modern DX'te Vitest one cikiyor.

**Sonuclar / dikkat:** NestJS + Vitest icin kucuk bir config (swc/esbuild transform) gerekir;
bunu Faz 8'de kurariz.

---

## Ikincil kararlar (odev gerekce istemiyor — bilgi amacli)

| Konu | Karar | Kisa gerekce |
|------|-------|--------------|
| ORM | **Prisma 7** | Tip-guvenli sorgu, migration, okunabilir sema; entity modelini netlestirir |
| i18n | **next-intl 4** | App Router ile uyumlu, `/tr` `/en` routing + mesaj yonetimi |
| Stil | **Tailwind CSS** | Tasarim korumayi hizli/surdurulebilir kilar, tutarli token'lar |
| Admin | **Next.js icinde `/admin`** | Daha az hareketli parca, tip paylasimi, tek deploy |
| Obje depolama | **MinIO** | Yerelde S3 uyumlu, Docker ile tek komutta ayaga kalkar |
| Monorepo | **npm workspaces** | Ekstra arac gerektirmez, Node ile gelir |

## Genel sonuc

Tutarli, **tek-dil (TypeScript)** bir yigin: Next.js (web+admin) + NestJS (api) +
PostgreSQL/Prisma + Redis + MinIO, Docker Compose ile **tek komutta** ayaga kalkar.
Her karar; gereksinimle, olceklenebilirlikle ve tek kisilik gelistirme hiziyla gerekcelendirildi.
