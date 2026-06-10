# Deployment Yaklasimi, Olcekleme ve Gozlemlenebilirlik

> PDF "Mimari" basligindaki uc maddeyi kapatir: deployment yaklasimi,
> olcekleme stratejisi, logging & monitoring. Yerel calisma zaten tek komut:
> `docker compose up --build`.

## 1. Deployment yaklasimi

Mevcut compose **gelistirme** odaklidir (bind-mount + hot-reload + watch).
Uretim icin ayni imaj stratejisi su sekilde evrilir:

| Asama | Dev (mevcut) | Prod (hedef) |
|------|-------------|--------------|
| Web | `next dev --webpack` (bind-mount) | `next build` + `next start` (standalone output) — ayri, kucuk imaj |
| API | `nest start --watch` | `nest build` + `node dist/main` — ayri imaj |
| Statik/medya | Next public + MinIO | CDN onunde (CloudFront/Cloudflare): `_next/static` immutable, `/_next/image` ve MinIO/S3 cache'li |
| Migration | container acilisinda `migrate deploy` | CI/CD adimi olarak `prisma migrate deploy` (uygulamadan ayrik, tek sefer) |
| Secrets | `.env` | Secret manager (SSM/Vault); imaja gomulmez |

**CI/CD hatti (oneri):** lint + tsc + test → imaj build (multi-stage, prod target)
→ migration job → rolling deploy. Imajlar registry'de sürümlenir (git SHA tag).

## 2. Olcekleme stratejisi

- **Web (Next):** stateless → yatay olceklenir. ISR cache'i cok-replika senaryoda
  paylasimli olmali (Next cacheHandler ile Redis) ya da revalidate API'si tum
  replikalara fan-out edilmeli; tek replika + CDN cogu yuku zaten karsilar
  (sayfalar ISR + CDN'de donar, origin'e az istek duser).
- **API (Nest):** stateless (JWT; oturum yok) → yatay olceklenir. Dikkat noktalari:
  - *SSE*: baglantilar node-yerel `Subject` uzerinde. Cok replika icin event'ler
    **Redis pub/sub** uzerinden fan-out edilir (EventsService'in publish/subscribe'i
    Redis'e tasinir — arayuz ayni kalir, bilinçli olarak tek-node basladik).
  - *Zamanlanmis yayin cron'u*: cok replikada cift calisma riski → Redis lock
    (`SET NX PX`) ile tek lider.
- **PostgreSQL:** dikey + read-replica (public okuma sorgulari replikaya).
- **Redis:** tek node yeterli (cache + kuyruk hafif); gerekirse Sentinel.
- **MinIO/S3:** zaten obje deposu; prod'da yonetilen S3 + CDN.

## 3. Logging & monitoring

**Mevcut:** NestJS `Logger` (yapilandirilmis kategori bazli loglar: Prisma baglanti,
form webhook, AI blok dususleri, scheduler); `GET /api/health` canlilik ucu;
`AuditLog` tablosu icerik-duzeyinde "kim ne yapti" izini tutar (uygulama-ici audit,
sistem logu degil).

**Prod hedefi (oneri):**

| Katman | Arac | Ne toplanir |
|--------|------|-------------|
| Log toplama | pino (JSON) → Loki/CloudWatch | request-id korelasyonlu istek loglari, hata stack'leri |
| Metrikler | `@willsoto/nestjs-prometheus` → Prometheus + Grafana | istek suresi/oran/hata orani (RED), Node heap, Redis hit orani |
| Uptime/alarm | healthcheck + alertmanager | `/api/health` 200 disi, 5xx orani esigi |
| Frontend CWV | Vercel Analytics veya `web-vitals` → kendi ucumuz | LCP/CLS/INP gercek kullanici verisi |

## 4. Performans olcumu (mevcut durum)

Dev ortami olcumu (headless, 1440x900, `/tr`): **TTFB ~0.6s, tam yuk ~1.4s** —
dev derleyici dahil. Prod build'de (minify + ISR + CDN) belirgin dusus beklenir.
Gorsel hatti: tum buyuk gorseller `next/image` (otomatik **WebP/AVIF**, lazy,
CLS korumasi, `priority` hero grafiginde); kaynak asset'ler sharp ile onceden
optimize edilmis (~%70 kucultme).
