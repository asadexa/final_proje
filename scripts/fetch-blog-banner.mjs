// Blog banner bandi + footer-top form zemini gorselleri
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const items = [
  {
    url: "https://krontech.com/_upload/bannerimages/66b3f3362bf39418420b9a5c2dadc037-5eccfbd5a5018.jpg",
    out: "apps/web/public/kron/blog-banner.jpg",
    width: 1140, // .container icinde 226px bant
  },
  {
    url: "https://krontech.com/project/_resources/images/man-with-headphones.jpg",
    out: "apps/web/public/kron/footer-form-bg.jpg",
    width: 1920, // tam genislik koyu form zemini
  },
];

for (const it of items) {
  const res = await fetch(it.url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) {
    console.error("FAIL " + it.url + " HTTP " + res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.resolve(it.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(buf)
    .resize({ width: it.width, withoutEnlargement: true })
    .jpeg({ mozjpeg: true, quality: 70 })
    .toFile(outPath);
  console.log(`${it.out}  ${(buf.length / 1024).toFixed(0)}KB -> ${(fs.statSync(outPath).size / 1024).toFixed(0)}KB`);
}
