"use client";

import { useEffect, useState } from "react";
import { ensureSession, revalidateSession } from "./admin";

// Tek noktadan admin auth guard'i (A1 — 13 sayfadaki `if(!getToken()) redirect` tekrarini
// kaldirir). In-memory access token (A2) sayfa yenilemede bellekte olmadigindan once sessiz
// refresh denenir; basarisizsa login'e yonlendirilir.
//
// BFCache: logout sonrasi back-button /admin'i BFCache'ten heap'iyle geri yukleyebilir → eski
// in-memory token "stale" canlanir (access JWT stateless, ~15dk gecerli). React effect'i o anda
// YENIDEN calismaz; bu yuzden `pageshow` + `persisted` dinlenir ve token'a GUVENMEDEN yeniden
// dogrulanir (revalidateSession) — refresh cookie yoksa (logout) login'e atilir.
//
// Donen `ready` true olana kadar sayfa korumali veri cekmemeli/icerik gostermemeli:
//   const ready = useAdminGuard();
//   useEffect(() => { if (ready) void load(); }, [ready, load]);
export function useAdminGuard(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const toLogin = (): void => {
      if (typeof window !== "undefined") window.location.href = "/admin/login";
    };

    void ensureSession().then((ok) => {
      if (!alive) return;
      if (ok) setReady(true);
      else toLogin();
    });

    // Yalniz BFCache geri yuklemesinde (persisted=true) tetiklenir; normal ilk yuklemede
    // persisted=false oldugundan ekstra is yapilmaz.
    const onPageShow = (e: PageTransitionEvent): void => {
      if (!e.persisted) return;
      void revalidateSession().then((ok) => {
        if (!alive) return;
        if (!ok) toLogin();
      });
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      alive = false;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return ready;
}
