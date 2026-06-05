# Genisletme & Canli Degisiklik Rehberi

> Amac: projede **canli** (mulakatta) hizli ve guvenli degisiklik yapabilmek. Mimari bilincli
> olarak moduler: her degisiklik az sayida, belirli dosyaya dokunur.

## Modulerlik ilkeleri (neden kolay degisir)

- **NestJS feature modulleri:** Her alan kendi modulu — `auth/`, `health/`, (gelecek) `content/`,
  `media/`, `forms/`. Her biri controller + service + dto. `PrismaModule` global.
- **Blok tabanli icerik:** Yeni bilesen = veri + sema + render bileseni; **DB migration cogu
  zaman gerekmez**.
- **Locale tablosu:** Yeni dil = bir satir; **migration yok**.
- **Tek `Entry` + tek cozumleyici:** Yeni icerik turu tek noktadan akar.
- **`packages/shared`:** FE/BE ortak tipler tek kaynaktan (no `any`).

---

## Resete 1 — Yeni blok tipi eklemek (orn. `PRICING`)

1. **Sema:** `apps/api/prisma/schema.prisma` → `enum BlockType { ... PRICING }` → `npm run prisma:migrate -w @kron/api --name add_pricing_block`
2. **Tip + dogrulama:** `packages/shared` → `PRICING` icin Zod semasi (data sekli).
3. **Admin form:** blok editoru semadan otomatik uretir (generic) — ekstra kod gerekmeyebilir.
4. **Frontend render:** `apps/web` blok registry'sine `PRICING -> <PricingBlock/>` bileseni ekle.

> Render-only degisiklik (sema zaten enum'da varsa) migration gerektirmez.

## Resete 2 — Yeni icerik turu (`EntryType`, orn. `EVENT`)

1. `schema.prisma` → `enum EntryType { ... EVENT }` (+ gerekiyorsa `EventDetail` 1:1 tablo) → migrate.
2. `content` modulunde liste/sorgu turu ekle (Entry zaten ortak).
3. Frontend route + sayfa sablonu.

## Resete 3 — Yeni dil eklemek (orn. `de`)

1. `Locale` tablosuna satir (admin panel ya da seed): `{ code: 'de', name: 'Deutsch' }`. **Migration yok.**
2. Frontend i18n locale listesine `de` ekle (`NEXT_PUBLIC_LOCALES`).
3. Icerikleri ilgili `TranslationGroup` altinda olustur.

## Resete 4 — Yeni API modulu (NestJS)

```bash
# apps/api icinde
npx nest g module content && npx nest g controller content && npx nest g service content
```
- `PrismaService` global oldugu icin dogrudan enjekte edilir.
- Korumali uclar: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')`.
- Swagger otomatik gunceller (`@ApiTags`, DTO'lar).

## Resete 5 — Yeni form eklemek (orn. `partner`)

1. `FormDefinition` satiri (seed ya da admin): `key: 'partner'`, `fields: [...]`.
2. Frontend form sayfasi `key`'i kullanir; backend validasyon + KVKK + spam korumasi ortak.

## Resete 6 — Yeni SEO alani

1. `Seo` modeline kolon ekle → migrate.
2. SEO DTO + admin form alani + frontend `<head>` ciktisinda kullan.

---

## Canli demo ipuclari

- Degisiklik sonrasi: API icin `docker compose restart api` (ya da hot-reload), FE icin Next
  hot-reload.
- Migration: `npm run prisma:migrate -w @kron/api --name <ad>`.
- Her yeni karar: `docs/decision-log.md` + gerekiyorsa yeni ADR.
