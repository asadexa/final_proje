// Gecici: TR sayfadan footer form etiketlerini (baslik, placeholder'lar) cikar
import fs from "node:fs";
import path from "node:path";

const tmp = process.env.TEMP ?? "/tmp";
const h = fs.readFileSync(path.join(tmp, "kron-blog-tr1.html"), "utf8");
const i = h.indexOf("footer-top");
const seg = h.slice(i, i + 1600);
const title = seg.match(/footer-top-title.>([^<]+)</);
console.log("title:", title && title[1]);
const p = seg.match(/<p>([\s\S]{0,250}?)<\/p>/);
console.log("para:", p && p[1].replace(/<[^>]+>/g, ""));
const ph = [...seg.matchAll(/placeholder="([^"]+)"/g)].map((m) => m[1]);
console.log("placeholders:", ph.join(" | "));
