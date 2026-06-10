"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, getToken, logout } from "@/lib/admin";

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: "Aksiyonlar" | "İçerikler" | "Formlar" | "Medya";
  run: () => void;
}

// Basit fuzzy: sorgu karakterleri sirayla geciyorsa eslesir; erken/ardisik
// eslesme daha yuksek skor alir (VS Code hissi icin yeterli, kutuphanesiz).
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += 2 + streak; // ardisik eslesme bonusu
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return 0; // tum karakterler gecmedi
  return score + Math.max(0, 30 - t.length); // kisa metin bonusu
}

// Global komut paleti (Ctrl+K): aksiyon + icerik/form/medya aramasi, klavye navigasyonu.
export function CommandPalette(): ReactElement | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [dynamic, setDynamic] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  const actions = useMemo<Item[]>(
    () => [
      { id: "a-new", label: "Yeni İçerik Oluştur", hint: "sayfa / ürün / yazı", group: "Aksiyonlar", run: () => go("/admin/entries/new") },
      { id: "a-entries", label: "İçerikler", group: "Aksiyonlar", run: () => go("/admin") },
      { id: "a-media", label: "Medya Kütüphanesi", group: "Aksiyonlar", run: () => go("/admin/media") },
      { id: "a-forms", label: "Formlar", group: "Aksiyonlar", run: () => go("/admin/forms") },
      { id: "a-newform", label: "Yeni Form Tanımla", group: "Aksiyonlar", run: () => go("/admin/forms/new") },
      { id: "a-redirects", label: "Yönlendirmeler (301/302)", group: "Aksiyonlar", run: () => go("/admin/redirects") },
      { id: "a-audit", label: "Denetim Kaydı", group: "Aksiyonlar", run: () => go("/admin/audit") },
      { id: "a-site", label: "Siteyi Aç (yeni sekme)", group: "Aksiyonlar", run: () => window.open("/tr", "_blank") },
      { id: "a-logout", label: "Çıkış Yap", group: "Aksiyonlar", run: () => logout() },
    ],
    [go],
  );

  // Acilista icerik/form/medya indexini cek (tek sefer, hafif listeler)
  const loadIndex = useCallback(async () => {
    const [entries, forms, media] = await Promise.all([
      adminFetch<{ items: Array<{ id: string; title: string; type: string; localeCode: string; slug: string }> }>(
        "/admin/entries?pageSize=100",
      ),
      adminFetch<Array<{ key: string; name: string }>>("/admin/forms"),
      adminFetch<{ items: Array<{ id: string; url: string }> }>("/admin/media?pageSize=50"),
    ]);
    const items: Item[] = [];
    for (const e of entries?.items ?? []) {
      items.push({
        id: `e-${e.id}`,
        label: e.title,
        hint: `${e.type} · ${e.localeCode} · /${e.slug}`,
        group: "İçerikler",
        run: () => go(`/admin/entries/${e.id}`),
      });
    }
    for (const f of forms ?? []) {
      items.push({ id: `f-${f.key}`, label: f.name, hint: `form · /${f.key}`, group: "Formlar", run: () => go(`/admin/forms/${f.key}`) });
    }
    for (const m of media?.items ?? []) {
      const name = m.url.split("/").pop() ?? m.url;
      items.push({ id: `m-${m.id}`, label: name, hint: "medya", group: "Medya", run: () => go("/admin/media") });
    }
    setDynamic(items);
  }, [go]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!getToken()) return;
        setOpen((o) => {
          if (!o) {
            setQuery("");
            setCursor(0);
            void loadIndex();
          }
          return !o;
        });
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadIndex]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const all = [...actions, ...dynamic];
    return all
      .map((item) => ({ item, score: fuzzyScore(query, `${item.label} ${item.hint ?? ""}`) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.item);
  }, [actions, dynamic, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter" && results[cursor]) {
              results[cursor].run();
            }
          }}
          placeholder="Komut veya içerik ara…  (↑↓ gez, Enter çalıştır, Esc kapat)"
          className="w-full border-b border-line bg-surface px-5 py-4 text-sm outline-none"
        />
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => r.run()}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center justify-between px-5 py-2.5 text-left text-sm ${i === cursor ? "bg-primary/10 text-primary" : "text-ink"}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase text-muted">
                    {r.group}
                  </span>
                  <span className="truncate font-medium">{r.label}</span>
                </span>
                {r.hint && <span className="ml-3 shrink-0 text-xs text-muted">{r.hint}</span>}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted">Sonuç yok.</li>
          )}
        </ul>
        <div className="border-t border-line px-5 py-2 text-[11px] text-muted">
          Ctrl+K ile aç/kapat · {dynamic.length > 0 ? `${dynamic.length} öğe indexlendi` : "index yükleniyor…"}
        </div>
      </div>
    </div>
  );
}
