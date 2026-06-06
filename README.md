# Kron CMS — krontech.com Yeniden Gelistirme

krontech.com'un tasarimi korunarak; **icerik yonetimi (CMS)**, **SEO/GEO** altyapisi,
**cok dillilik (TR/EN)**, **cache/performans** ve **yayin surecleri** ile birlikte ele alinmis
butuncul bir sistem.

> Bu bir gorsel kopya degil; arkasinda tam bir yonetim sistemi olan bir platformdur.

## Mimari (ozet)

| Parca | Teknoloji | Rol |
|-------|-----------|-----|
| `apps/web` | Next.js 16 + TS (App Router) | Public site + `/admin` paneli; SSR/ISR, cok dilli routing (`/tr`, `/en`) |
| `apps/api` | NestJS 11 + TS | REST API (OpenAPI/Swagger), JWT auth + RBAC, Prisma, Redis cache, S3 upload |
| `packages/shared` | TypeScript | Paylasilan tipler/enum'lar (Role, Locale, PageType, BlockType...) |
| PostgreSQL | 16 | Birincil veri deposu |
| Redis | 7 | Cache + zamanlanmis yayin kuyrugu |
| MinIO | — | S3 uyumlu medya deposu |

Mimari detay: [`docs/architecture.md`](docs/architecture.md) · Kararlar: [`docs/adr/`](docs/adr/)

## Hizli baslangic (tek komut)

Gereksinim: **Docker** + **Docker Compose**.

```bash
cp .env.example .env
docker compose up --build
```

| Servis | Adres |
|--------|-------|
| Web (public + admin) | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger (API dokumantasyonu) | http://localhost:4000/docs |
| MinIO konsolu | http://localhost:9001 |

## Yerel gelistirme (Docker'siz uygulamalar)

```bash
npm install
docker compose up postgres redis minio -d   # sadece altyapi
npm run dev                                  # api + web birlikte
```

## Teknoloji kararlari (ozet)

| Konu | Karar | Neden |
|------|-------|-------|
| Backend | **NestJS** | Uctan uca TS, modulerlik, Swagger/guard/pipe first-class |
| API | **REST + OpenAPI** | Swagger gereksinimi, cache/rate-limit basit |
| Auth | **JWT access+refresh + RBAC** | Stateless, olceklenebilir |
| Test | **Vitest + Supertest** | Hiz, ESM, tek arac |

Tam gerekceler: [`docs/adr/0001-tech-stack.md`](docs/adr/0001-tech-stack.md)

## Dizin yapisi

```
.
├── apps/
│   ├── api/        # NestJS REST API
│   └── web/        # Next.js (public site + admin)
├── packages/
│   └── shared/     # Paylasilan TypeScript tipleri
├── docs/
│   ├── adr/        # Mimari karar kayitlari
│   └── architecture.md
├── docker-compose.yml
└── .env.example
```

## Komutlar

| Komut | Aciklama |
|-------|----------|
| `npm run dev` | api + web birlikte (yerel) |
| `npm run build` | Tum uygulamalari derle |
| `npm run test` | Tum testler |
| `npm run lint` | Lint |
| `docker compose up --build` | Tum sistem (tek komut) |

## Durum

Tum ana fazlar tamam: icerik modeli + headless API, **admin panel** (icerik CRUD + blok siralama + medya + SEO + formlar),
**yayin akisi** (taslak/yayin/zamanlanmis/onizleme/versiyon+restore/audit), **SEO/GEO**
(meta/canonical/hreflang/sitemap/robots/301 + schema.org JSON-LD/FAQPage), **cok dillilik** (TR/EN),
**Redis cache + publish'te `revalidateTag`**, **formlar** (client+sunucu validasyon + KVKK + honeypot + CSV export),
ve **testler** (Vitest + Supertest, birim + entegrasyon). Karsilastirma analizi: [`docs/comparison.md`](docs/comparison.md).

Giris (admin): `admin@kron.local` / `Admin123!` → http://localhost:3000/admin
