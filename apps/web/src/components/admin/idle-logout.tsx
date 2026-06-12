"use client";

import { useEffect, useRef } from "react";
import { getToken, logout } from "@/lib/admin";

// Admin paneli hareketsizlik (idle) timeout'u: 15 dk fare/klavye hareketi olmazsa
// SESSIZCE logout + login'e yonlendir. Yuksek-yetkili panel sertlestirmesi.
// Not: timeout aninda getToken() kontrol edilir — login sayfasinda (token yok)
// logout cagrilmaz, yani redirect dongusu olusmaz. Layout App Router'da kalici
// oldugu icin login -> /admin client gecisinde de listener'lar yasamaya devam eder.
const IDLE_MS = 15 * 60 * 1000; // 15 dakika

export function IdleLogout(): null {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = (): void => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (getToken()) logout();
      }, IDLE_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
