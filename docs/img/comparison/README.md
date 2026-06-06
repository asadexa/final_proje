# comparison.md gorsel kaniti

[`../../comparison.md`](../../comparison.md) Bolum 1'de gomulu ekran goruntuleri.
Headless tarayici (gstack/browse, 1440x900) ile cekildi — krontech.com vs http://localhost:3000/en.

| Alan | krontech | rebuild |
|------|----------|---------|
| Header + Hero (viewport) | `header-krontech.png` | `header-ours.png` |
| Footer (viewport) | `footer-krontech.png` | `footer-ours.png` |
| Tam sayfa | `full-krontech.png` | `full-ours.png` |

Yeniden cekim:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
"$B" viewport 1440x900
"$B" goto http://localhost:3000/en && "$B" wait --load
"$B" screenshot --viewport header-ours.png   # header+hero
"$B" screenshot full-ours.png                # tam sayfa
"$B" scroll footer && "$B" screenshot --viewport footer-ours.png
# krontech icin: goto https://krontech.com/ + cleanup --cookies, ayni adimlar
```
