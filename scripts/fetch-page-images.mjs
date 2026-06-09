// Gecici yardimci: resources + contact sayfa gorselleri (banner/kart/ofis).
// fetch-product-images.mjs ile ayni kalip; role gore sharp optimize.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const jobs = [
  // bannerlar (gray-bg-top 226px, 1140 genis goruntulenir -> 1440 kaynak yeterli)
  { url: "/_upload/bannerimages/siber-guvenlik-kaynaklar-1440x400.jpg", out: "resources/banner.jpg", w: 1440 },
  { url: "/_upload/bannerimages/0a4ffcdd7dffb8c9a2009ff8d0c8aac0-5f4d3439bb0ff.jpg", out: "contact/banner.jpg", w: 1440 },
  // kaynak kartlari (350x170 gosterim, retina icin 700)
  { url: "/_upload/listcontentimages/case_study_350x170.jpg", out: "resources/card-case-studies.jpg", w: 700 },
  { url: "/_upload/listcontentimages/datasheet_350x170.jpg", out: "resources/card-datasheets.jpg", w: 700 },
  { url: "/_upload/listcontentimages/case_study_350x170_1.jpg", out: "resources/card-blog.jpg", w: 700 },
  // ofisler (col-6 ~555px gosterim -> 735)
  { url: "/_upload/contactimages/8f82ab4b14b02f69543c6734136685bc-5ef2450665bd7.jpg", out: "contact/office-istanbul.jpg", w: 735 },
  { url: "/_upload/contactimages/0e0e7abb95d460709a047bfb3a84bbfe-5f0b9646810b7.jpg", out: "contact/office-usa.jpg", w: 735 },
  { url: "/_upload/contactimages/3dca16b2017c62f1d24c0560514b04b8-5f0b919617dea.jpg", out: "contact/office-ankara.jpg", w: 735 },
  { url: "/_upload/contactimages/f14beef4bfee8bc3323bb61e711e7578-5f0b960e49073.jpg", out: "contact/office-izmir.jpg", w: 735 },
];
const outRoot = path.resolve("apps/web/public/kron/pages");
for (const j of jobs) {
  const res = await fetch("https://krontech.com" + j.url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) { console.error("FAIL " + j.url + " HTTP " + res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(outRoot, j.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(buf).resize({ width: j.w, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ mozjpeg: true, quality: 72 }).toFile(outPath);
  console.log(j.out, (buf.length / 1024).toFixed(0) + "KB ->", (fs.statSync(outPath).size / 1024).toFixed(0) + "KB");
}
