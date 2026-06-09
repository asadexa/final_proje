// Gecici yardimci: krontech TR blog liste sayfalarindan yapisal meta veri cikarir
// (slug, kapak gorseli URL, baslik, tarih). Seed icin girdi olusturur.
import fs from "node:fs";
import path from "node:path";

const tmp = process.env.TEMP ?? "/tmp";
const out = [];
for (const n of [1, 2, 3]) {
  const html = fs.readFileSync(path.join(tmp, `kron-blog-tr${n}.html`), "utf8");
  const re =
    /<div class="blog-item">[\s\S]*?<a href="([^"]+)">\s*<img class="card-img-top" src="([^"]+)" alt="[^"]*">[\s\S]*?<h4 class="card-title">([\s\S]*?)<\/h4>[\s\S]*?<b>([^<]+)<\/b>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({
      slug: m[1].replace(/^\/tr\//, "").replace(/^\//, ""),
      img: m[2],
      title: m[3].trim(),
      date: m[4].trim(),
    });
  }
}
fs.writeFileSync(path.join(tmp, "kron-blog-posts.json"), JSON.stringify(out, null, 2));
console.log(out.length + " posts");
for (const p of out) console.log(`${p.date} | ${p.title.slice(0, 60)} | ${p.img.split("/").pop()}`);
