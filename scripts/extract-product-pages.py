# krontech urun sayfalarindan yapilandirilmis icerik cikarir (1:1 seed icin).
# Kullanim: python scripts/extract-product-pages.py <html-dir> <out.json>
# NOT: cikti dosyaya direkt yazilir (PowerShell'de stdout > yonlendirmesi
# konsol codepage'iyle decode edip UTF-8'i bozuyor).
import json
import re
import sys
from pathlib import Path

SLUGS = [
    "kron-pam",
    "dynamic-data-masking",
    "database-access-manager",
    "aaa",
    "kron-telemetry-pipeline",
]


def text(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def inner_html(s: str) -> str:
    # b vurgularini koru, geri kalan etiketleri at
    s = re.sub(r"</?(?!/?b\b)[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def extract(path: Path) -> dict:
    html = path.read_text(encoding="utf-8", errors="ignore")
    out: dict = {}

    # --- hero (product-banner) ---
    m = re.search(r'<section class="product-banner-mobile.*?</section>', html, re.S)
    if m:
        sec = m.group(0)
        bg = re.search(r"background-image:url\(([^)]*)\)", sec)
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", sec, re.S)
        lead = re.search(r'<p class="lead[^"]*"[^>]*>(.*?)</p>', sec, re.S)
        btns = re.findall(r"<a[^>]*class=\"[^\"]*btn[^\"]*\"[^>]*(?:href=\"([^\"]*)\")?[^>]*>(.*?)</a>", sec, re.S)
        out["hero"] = {
            "bg": bg.group(1) if bg else None,
            "title": inner_html(h1.group(1)) if h1 else None,
            "lead": text(lead.group(1)) if lead else None,
            "buttons": [{"href": b[0], "label": text(b[1])} for b in btns],
        }

    # --- breadcrumb (desktop) ---
    m = re.search(r'<section class="mt-3 mb-0 breadcrumb-desktop.*?</section>', html, re.S)
    if m:
        crumbs = re.findall(r"<(?:a|li|span)[^>]*>([^<]+)</", m.group(0))
        out["breadcrumb"] = [c.strip() for c in crumbs if c.strip()]

    # --- tab nav ---
    m = re.search(r'<ul id="nav-tabs-wrapper".*?</ul>', html, re.S)
    if m:
        tabs = []
        for a in re.finditer(r'<a class="nav-link( active)?" href="([^"]*)"[^>]*>(.*?)</a>', m.group(0), re.S):
            icon = re.search(r'src="([^"]*)"', a.group(3))
            tabs.append({
                "active": bool(a.group(1)),
                "href": a.group(2),
                "icon": icon.group(1) if icon else None,
                "label": text(a.group(3)),
            })
        out["tabs"] = tabs

    # --- icerik bolumleri: container p-md-0px > row m-0 (metin+gorsel) ---
    body = html[html.find("</header>"):]
    body = re.sub(r"<(script|style).*?</\1>", "", body, flags=re.S)
    foot = body.find("<footer")
    main = body[:foot] if foot > 0 else body
    sections = []
    for sm in re.finditer(r'<div class="container p-md-0px">\s*<div class="row m-0">(.*?)</div>\s*</div>\s*</div>', main, re.S):
        chunk = sm.group(1)
        img = re.search(r'<img[^>]*src="([^"]*)"[^>]*?(?:alt="([^"]*)")?[^>]*>', chunk)
        h3 = re.search(r"<h3[^>]*>(.*?)</h3>", chunk, re.S)
        paras = [text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", chunk, re.S)]
        paras = [p for p in paras if p]
        # gorsel mi metin mi once geliyor -> media tarafi
        img_pos = chunk.find("<img")
        h3_pos = chunk.find("<h3")
        side = "left" if (img_pos >= 0 and img_pos < h3_pos) else "right"
        sections.append({
            "title": inner_html(h3.group(1)) if h3 else None,
            "paragraphs": paras,
            "image": img.group(1) if img else None,
            "imageAlt": (img.group(2) or "") if img else "",
            "mediaSide": side,
        })
    out["sections"] = sections

    # --- testimonial slider (blue-bg-slider) ---
    m = re.search(r'<div class="py-5 text-white[^"]*blue-bg-slider".*?(?=<div class="container p-md-0px"|<footer|<section)', main, re.S)
    if m:
        slides = []
        for s in re.finditer(r'<div class="swiper-slide[^"]*">(.*?)(?=<div class="swiper-slide|$)', m.group(0), re.S):
            chunk = s.group(1)
            img = re.search(r'<img[^>]*src="([^"]*)"', chunk)
            h3 = re.search(r"<h3[^>]*>(.*?)</h3>", chunk, re.S)
            paras = [text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", chunk, re.S)]
            paras = [p for p in paras if p]
            if not (h3 or paras):
                continue
            slides.append({
                "image": img.group(1) if img else None,
                "title": inner_html(h3.group(1)) if h3 else None,
                "paragraphs": paras,
            })
        out["testimonials"] = slides

    return out


def main() -> None:
    d = Path(sys.argv[1])
    result = {}
    for slug in SLUGS:
        for loc, prefix in (("en", "kron-"), ("tr", "kron-tr-")):
            p = d / f"{prefix}{slug}.html"
            if p.exists():
                result.setdefault(slug, {})[loc] = extract(p)
    out = Path(sys.argv[2])
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
