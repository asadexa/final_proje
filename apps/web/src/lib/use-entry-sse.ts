"use client";

import { useEffect, useRef } from "react";

// Entry editor SSE senkronizasyonu (C2'de god-component'ten cikarildi).
// - Disaridan (Time Machine restore, baska sekme/kullanici) gelen degisiklikte editoru tazeler.
// - Kendi PATCH/restore islemimizin uretigi olayi yutar: yazimdan ONCE markOwnWrite(), olay
//   gelmezse (hata/no-op) rollbackOwnWrite() ile geri alinir.
//
// C4 sertlestirme: yutma artik kayan bir SAYAC degil, ZAMAN-PENCERELI kuyruk. Her own-write bir
// zaman damgasi tutar; gelen olayda 5sn icindeki en eski own-write tuketilir, eskimis damgalar
// budanir. Boylece cok-sekme/hata halinde sayac sonsuza kadar kaymaz (kendiliginden duzelir).
const SUPPRESS_WINDOW_MS = 5000;

export function useEntrySse(opts: {
  id: string;
  dirty: boolean;
  load: () => Promise<void>;
  showToast: (kind: "ok" | "err", text: string) => void;
}): { markOwnWrite: () => void; rollbackOwnWrite: () => void } {
  const { id, dirty, load, showToast } = opts;

  // SSE handler'inda guncel dirty degeri icin ref (effect kapanisi bayatlamasin)
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Kendi yazma islemlerimizin zaman damgalari (yutulacak olaylar)
  const ownWrites = useRef<number[]>([]);

  // Bu icerik BASKA yerden degisirse editor kendini tazeler — "restore ettim ama editor eski
  // hali gosteriyor" sorunu biter.
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    // withCredentials: SSE ucu kimlik dogruluyor; httpOnly cookie gonderilir.
    const es = new EventSource(`${api}/api/events/content`, { withCredentials: true });
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data as string) as { entryId?: string; action?: string };
        if (e.entryId !== id) return;
        // eskimis own-write damgalarini buda -> sayac drift'i kendiliginden duzelir
        const now = Date.now();
        ownWrites.current = ownWrites.current.filter((t) => now - t < SUPPRESS_WINDOW_MS);
        if (ownWrites.current.length > 0) {
          ownWrites.current.shift(); // kendi kaydimizin olayi -> en eskisini tuket
          return;
        }
        if (dirtyRef.current) {
          showToast("err", "Bu içerik başka bir yerden değişti — kaydetmeden önce sayfayı yenileyin!");
          return;
        }
        void load();
        showToast(
          "ok",
          e.action === "restore"
            ? "Sürüm geri yüklendi — içerik tazelendi."
            : "İçerik başka bir yerden güncellendi — tazelendi.",
        );
      } catch {
        // bozuk event yutulur
      }
    };
    return () => es.close();
  }, [id, load, showToast]);

  return {
    markOwnWrite: () => {
      ownWrites.current.push(Date.now());
    },
    rollbackOwnWrite: () => {
      ownWrites.current.pop();
    },
  };
}
