// Gecici yardimci: kron-products.json'daki (extract-product-pages.py ciktisi)
// tum gorselleri indirir, role gore sharp ile optimize eder ve
// apps/web/public/kron/products/<slug>/ altina yazar.
// Cikti: %TEMP%/kron-product-images.json (kaynak URL -> yerel yol eslemesi; seed bunu kullanir).
// Not (Windows): sharp girdi dosya handle'ini kilitler -> girdiyi buffer'a oku.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const tmp = process.env.TEMP ?? "/tmp";
const data = JSON.parse(fs.readFileSync(path.join(tmp, "kron-products.json"), "utf8"));
const outRoot = path.resolve("apps/web/public/kron/products");

// url -> { slug, role, index } (en+tr ayni gorselleri kullanir -> dedupe)
const jobs = new Map();
function add(url, slug, role, index) {
  if (!url || jobs.has(url)) return;
  jobs.set(url, { slug, role, index });
}
for (const [slug, locs] of Object.entries(data)) {
  for (const v of Object.values(locs)) {
    add(v.hero?.bg, slug, "hero", 0);
    (v.tabs ?? []).forEach((t) => add(t.icon, "tabs", "icon", 0));
    (v.sections ?? []).forEach((s, i) => add(s.image, slug, "section", i + 1));
    (v.testimonials ?? []).forEach((s, i) => add(s.image, slug, "testimonial", i + 1));
  }
}

const mapping = {};
for (const [url, { slug, role, index }] of jobs) {
  const abs = "https://krontech.com" + url;
  let outName;
  let dir;
  if (role === "icon") {
    dir = path.join(outRoot, "tabs");
    outName = path.basename(url).toLowerCase();
  } else {
    dir = path.join(outRoot, slug);
    outName = role === "hero" ? "hero.jpg" : `${role}-${index}.jpg`;
  }
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, outName);
  try {
    const res = await fetch(abs, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const before = buf.length;
    let img = sharp(buf);
    if (role === "icon") {
      // seffaf png ikon (3x) -> alpha korunur, palette ile kuculur
      img = img.resize({ width: 96, withoutEnlargement: true }).png({ palette: true });
    } else if (role === "hero") {
      // tam genislik banner
      img = img.resize({ width: 1920, withoutEnlargement: true }).flatten({ background: "#0b0b0b" }).jpeg({ mozjpeg: true, quality: 70 });
    } else {
      // kolon gorseli (krontech 735x500 kullaniyor)
      img = img.resize({ width: 735, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ mozjpeg: true, quality: 72 });
    }
    await img.toFile(outPath);
    const after = fs.statSync(outPath).size;
    mapping[url] = "/kron/products/" + (role === "icon" ? "tabs/" + outName : slug + "/" + outName);
    console.log(`${mapping[url]}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.error("FAIL " + abs + " : " + e.message);
  }
}
fs.writeFileSync(path.join(tmp, "kron-product-images.json"), JSON.stringify(mapping, null, 2));
console.log(Object.keys(mapping).length + " images done");
