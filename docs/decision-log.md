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
