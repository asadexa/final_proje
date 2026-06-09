# Scripts — krontech icerik/asset boru hatti

Birebir tasarim parity'si **tahminle degil olcumle** kuruldu: krontech HTML/CSS'i
indirilir, yapilandirilmis icerik script'le cikarilir, gorseller indirilip
`sharp` ile display-aware optimize edilir, seed bu ciktiyi kullanir.
Tek seferlik yardimcilardir; tekrarlanabilirlik + sunum kaniti icin repoda tutulur.

## Calisma sirasi (ornek: urun detay turu)

```
1. Kaynak HTML'leri %TEMP%'e indir (kron-<slug>.html / kron-tr-<slug>.html)
2. python scripts/extract-product-pages.py %TEMP% %TEMP%/kron-products.json
3. node scripts/fetch-product-images.mjs        # gorselleri indir+optimize
4. apps/api/prisma/seed.ts                      # JSON'daki icerik seed'e islenir
```

## Dosyalar

| Script | Tur | Ne yapar |
|---|---|---|
| `extract-product-pages.py` | Urun detay | krontech urun HTML'lerinden hero/breadcrumb/sekme/bolum/testimonial cikarir -> JSON. **Cikti dosyaya yazilir** (PowerShell `>` yonlendirmesi konsol codepage'iyle UTF-8'i bozar) |
| `fetch-product-images.mjs` | Urun detay | `kron-products.json`'daki tum gorselleri indirir; role gore optimize: hero 1920px jpg, bolum 735px jpg (krontech'in kendi boyutu), sekme ikonlari seffaf png palette. Cikti: `apps/web/public/kron/products/` + url->yerel-yol eslemesi |
| `fetch-product-extras.mjs` | Urun detay | PAM ek gorselleri: testimonial logolari (seffaf png) + Sekerbank video bolumu gorseli |
| `scrape-blog.mjs` | Blog | krontech blog liste sayfalarindan yazi meta'lari (baslik/tarih/slug/kapak) -> JSON (seed `BLOG_ARCHIVE` icin) |
| `fetch-blog-images.mjs` | Blog | Blog kapak gorsellerini 730px mozjpeg optimize indirir -> `public/kron/blog/` |
| `fetch-blog-banner.mjs` | Blog | Blog liste banner'i + footer form zemini |
| `extract-footer-form.mjs` | Form | Footer-ustu "Bize Ulasin" formunun alan/stil yapisini cikarir |
| `opt-comparison-png.mjs` | Docs | `docs/img/comparison/` ekran goruntulerini png palette ile kucultur |

## Notlar / ogrenilen gotcha'lar

- **sharp (Windows):** girdi dosya handle'ini kilitler — ayni path'e yazmadan once
  girdiyi `fs.readFileSync` ile buffer'a oku.
- **PowerShell 5.1 + python stdout:** UTF-8 cikti `>` ile dosyaya yonlendirilirse
  konsol codepage'i (cp1254) uzerinden bozulur (`™` -> `�`). Script'ler bu yuzden
  ciktiyi kendileri dosyaya yazar.
- Node script'leri repo kokunden calistirilir (`sharp` kok `node_modules`'dan cozulur).
