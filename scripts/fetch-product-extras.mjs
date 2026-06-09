// Gecici yardimci: PAM sayfasi ek gorselleri — testimonial logolari (seffaf png)
// + Sekerbank video bolumu gorseli. fetch-product-images.mjs'in devami.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = path.resolve("apps/web/public/kron/products/kron-pam");
const jobs = [
  { url: "/_upload/descriptionlogos/Anadolu_Efes_logo__90x65px.png", out: "logo-efes.png", kind: "logo" },
  { url: "/_upload/descriptionlogos/0ab0430e8c48dba8b5e644d48008212c-5f4f70e782671.png", out: "logo-turkcell.png", kind: "logo" },
  { url: "/_upload/descriptioncontentimages/kron_sekerbank_967x644_1.jpg", out: "case-sekerbank.jpg", kind: "photo" },
];
for (const j of jobs) {
  const res = await fetch("https://krontech.com" + j.url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) { console.error("FAIL " + j.url + " HTTP " + res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  let img = sharp(buf);
  if (j.kind === "logo") img = img.resize({ width: 320, withoutEnlargement: true }).png({ palette: true }); // alpha korunur
  else img = img.resize({ width: 967, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ mozjpeg: true, quality: 72 });
  await img.toFile(path.join(outDir, j.out));
  console.log(j.out, (buf.length / 1024).toFixed(0) + "KB ->", (fs.statSync(path.join(outDir, j.out)).size / 1024).toFixed(0) + "KB");
}
