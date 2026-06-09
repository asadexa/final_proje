// Gecici yardimci: kron-blog-posts.json'daki kapak gorsellerini indirir,
// sharp ile 730px genislige (liste karti boyutu) optimize edip
// apps/web/public/kron/blog/ altina yazar.
// Not (Windows): sharp girdi dosya handle'ini kilitler -> girdiyi buffer'a oku.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const tmp = process.env.TEMP ?? "/tmp";
const posts = JSON.parse(fs.readFileSync(path.join(tmp, "kron-blog-posts.json"), "utf8"));
const outDir = path.resolve("apps/web/public/kron/blog");
fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const p of posts) {
  const url = "https://krontech.com" + p.img;
  const base = p.slug.slice(0, 60).replace(/[^a-z0-9-]/gi, "");
  const outName = base + ".jpg";
  const outPath = path.join(outDir, outName);
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const before = buf.length;
    await sharp(buf)
      .resize({ width: 730, withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // webp/png seffaflik ihtimaline karsi
      .jpeg({ mozjpeg: true, quality: 72 })
      .toFile(outPath);
    const after = fs.statSync(outPath).size;
    results.push({ slug: p.slug, file: outName, title: p.title, date: p.date });
    console.log(`${outName}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.error("FAIL " + url + " : " + e.message);
  }
}
fs.writeFileSync(path.join(tmp, "kron-blog-images.json"), JSON.stringify(results, null, 2));
console.log(results.length + " images done");
