# Mimari — Kron CMS

> Bu belge her fazda detaylandirilir. Su an: **Faz 0** (genel cerceve).
> Kararlarin gerekceleri: [`adr/0001-tech-stack.md`](adr/0001-tech-stack.md).

## 1. Genel bakis

Kron CMS, krontech.com'u **headless CMS** modeliyle yeniden kurar: icerik (sayfa,
bilesen, blog, urun, medya, SEO) tek bir backend'de yonetilir; public site bu icerigi
API'den okuyup **SSR/ISR** ile render eder. Yonetim, ayni Next.js uygulamasi icindeki
korumali `/admin` alanindan yapilir.

```
                    ┌───────────────────────────────────────────────┐
   Ziyaretci ─────► │  Next.js (apps/web)                            │
   /tr /en          │  • Public site (SSR/ISR, cok dilli)            │
                    │  • /admin (JWT korumali yonetim paneli)        │
                    └───────────────┬───────────────────────────────┘
                                    │ REST (OpenAPI)
                                    ▼
                    ┌───────────────────────────────────────────────┐
                    │  NestJS (apps/api)                             │
   Editor/Admin ──► │  auth · content · media · seo · forms · publish│
                    │  Guards(JWT/RBAC) · Cache · Throttler · Swagger│
                    └──────┬───────────────┬───────────────┬────────┘
                           │               │               │
                     ┌─────▼────┐    ┌─────▼────┐    ┌──────▼─────┐
                     │PostgreSQL│    │  Redis   │    │   MinIO    │
                     │ (Prisma) │    │cache+kuy.│    │ (S3 medya) │
                     └──────────┘    └──────────┘    └────────────┘
```

## 2. Bilesenler

| Bilesen | Sorumluluk |
|---------|-----------|
| **apps/web** | Public site (6 sayfa tipi) + admin paneli. SSR/ISR, i18n routing, SEO/GEO ciktilari, Next/Image. |
| **apps/api** | REST API; icerik/medya/SEO/form/yayin is mantigi, auth, cache, rate limit, Swagger. |
| **packages/shared** | Frontend+backend ortak TypeScript tipleri/enum'lari (Faz 2'de eklenecek). |
| **PostgreSQL** | Birincil, iliskisel veri deposu (icerik modeli). |
| **Redis** | Uygulama cache'i + zamanlanmis yayin kuyrugu (BullMQ) + JWT refresh denylist. |
| **MinIO** | S3 uyumlu obje deposu (medya kutuphanesi). |

## 3. Istek yasam dongusu (ozet)

- **Public sayfa:** Next.js sunucu tarafi, `API_INTERNAL_URL` uzerinden API'yi cagirir
  (docker network ici). Sayfa **ISR** ile cache'lenir; icerik publish edilince API,
  Next'in revalidate webhook'unu tetikler (Faz 7).
- **Admin islemi:** Tarayicidaki `/admin`, JWT (httpOnly cookie) ile API'ye yazar; API
  Guard'larla rol kontrolu yapar, degisiklikleri audit log'a yazar (Faz 3).

## 4. Cok dillilik

`/tr` ve `/en` segment-bazli routing (next-intl). Icerik modelinde her kayit bir
**locale** ile iliskili; ceviriler bir **translation group** uzerinden eslesir (hreflang
ve "dile gore icerik" icin). Detay: Faz 1 icerik modeli.

## 5. Cache katmanlari (Faz 7'de detay)

1. **CDN** (statik varliklar, public sayfalar) — uretimde.
2. **Next.js ISR** — sayfa duzeyinde, publish'te invalidation.
3. **Redis** — API yanit/sorgu cache'i, etiket-bazli temizleme.

## 6. Yerel gelistirme & deployment

- **Tek komut:** `docker compose up --build` → postgres + redis + minio + api + web.
- **Imaj:** Tek monorepo imaji (`Dockerfile`), servisler farkli komutla calisir.
- **Uretim (oneri):** api ve web icin ayri multi-stage imajlar (`next start`,
  `node dist/main`), yatay olcekleme (stateless API), managed Postgres/Redis/S3. (Faz 9)

## 7. Olcekleme, loglama, monitoring (Faz 9'da detay)

- API stateless → yatay olceklenir; oturum durumu Redis'te degil JWT'de.
- Yapilandirilmis (JSON) loglama, request-id correlation; saglik ucu `/api/health`.
- Metrikler ve hata izleme uretimde (orn. OpenTelemetry/Sentry) — oneri olarak belgelenecek.
