# Canli Demo Senaryosu (~12 dk)

> Sunum oncesi: `docker compose up --build` calisiyor olsun; **taze reseed** onerilir
> (test kalintilari temizlenir): `docker compose exec -T api sh -lc "cd apps/api && npx prisma migrate reset --force && npx prisma db seed"`
> ardindan Redis flush + web restart. Iki tarayici penceresi hazirla.

| # | Sure | Durak | Goster | Soyle |
|---|------|-------|--------|-------|
| 1 | 1dk | `/tr` ana sayfa | Hero karuseli, urun kartlari, blog | "Tasarim krontech'ten **olculen** CSS degerleriyle birebir — tahmin degil introspection. Kanit: docs/comparison.md ekran goruntuleri" |
| 2 | 1dk | `/tr/kron-pam` | Banner, ikonlu sekmeler, referans slider | "Icerik script'le cikarildi (scripts/), gorseller sharp ile optimize. TR'yi bilincli olarak tam yerellestirdik — krontech kendi TR'sinde govdeyi Ingilizce birakmis" |
| 3 | 1dk | `/admin` giris | Ctrl+K → "kron pam" → Enter | "Komut paleti: her seye klavyeden ulasilir" |
| 4 | 2dk | 🎨 Gorsel Duzenle | Bloga tikla → basligi degistir → ANINDA yansir → Ctrl+Z → "+ Blok ekle" galerisi (canli preset onizlemeleri) → Kaydet | "Onizleme uretimle birebir cunku AYNI React bilesenleri — ayri template motoru yok" |
| 5 | 1dk | Iki pencere: editor + Onizle sekmesi | Editorde kaydet → onizleme KENDINI tazeler (yesil nokta + son olay) | "SSE — WebSocket degil: tek yonlu yayin yeterli, native reconnect" |
| 6 | 1.5dk | Zaman Tuneli | Surum sec → gorsel onizleme → iki surum sec → diff (yan yana) → restore | "Her kayit snapshot; restore idempotent — ayni surume ikinci donus kopya almaz" |
| 7 | 1dk | Saglik Denetimi | Denetle → bulgular (PAM'de gercek bulgu var: 162 krlik meta) | "Kural tabanli, AI'siz — deterministik. SEO+erisilebilirlik+GEO" |
| 8 | 1.5dk | Onay akisi | Cikis → `editor@kron.local / Editor123!` ile gir → PUBLISHED secenegi YOK → REVIEW'a gonder → admin'le gir → "Onayla ve Yayinla" | "Rol sunucuda zorlanir (403) — UI sadece yansitir" |
| 9 | 1dk | ✨ AI Mimar | Prompt yaz → uret → rozet (sablon/Claude) → editorde ac | "LLM ciktisi Zod kapisindan gecmeden DB'ye yazilamaz — AI'a sema dayatiyoruz" |
| 10 | 0.5dk | Iliski Grafigi (Ctrl+K) | Yetim sayfalar, ceviri kenarlari | "Bloklardaki linklerden otomatik cikariliyor" |
| 11 | 1dk | SEO kaniti | view-source: canonical/hreflang/OG image/JSON-LD; `/sitemap.xml`, `/robots.txt`; `/eski-pam` → 301 | "GEO: FAQPage + semantik HTML + LLM-uyumlu blok yapisi" |
| 12 | 0.5dk | Swagger `/docs` + testler | `npm test` → 29/29 | "REST + OpenAPI + rate limit; birim + entegrasyon testleri" |

## Olasi sorular icin hizli cevaplar

- **Neden NestJS?** Uctan uca TS, modul/guard/pipe mimarisi, Swagger first-class (ADR-0001).
- **Neden REST, GraphQL degil?** Icerik okuma desenleri basit + HTTP cache/CDN dostu + Swagger sarti.
- **Cache stratejisi?** 3 katman: Redis (API 60s) + Next ISR (60s, publish'te `revalidateTag` ile aninda) + CDN'e hazir. Publish → API revalidate cagrisi → kullanici aninda gorur.
- **SEO kaybi nasil onlenir?** URL yapisi korundu (flat slug), 301 yonetimi admin'de, sitemap+hreflang dinamik.
- **AI'in gelistirmedeki rolu?** docs/decision-log.md her turda AI katkisi + karar gerekceleriyle tutuldu; olcum-tabanli parite (introspection) AI ile yapildi.
- **Test edilemeyen ne var?** Cok-replika SSE fan-out (Redis pub/sub tasarimi hazir, docs/deployment.md) ve CDN katmani — yerel kapsamin disinda, bilincli.
