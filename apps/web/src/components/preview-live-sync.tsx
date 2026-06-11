"use client";

import { useRouter } from "next/navigation";
import { type ReactElement, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ContentEvent {
  action: string;
  entryId: string;
  slug?: string;
  localeCode?: string;
  changedBlocks?: string[];
  at: string;
}

// Figma-tarzi canli onizleme senkronu: SSE'den icerik olaylarini dinler;
// BU sayfa degistiyse router.refresh() ile yenilemesiz tazeler.
// EventSource native auto-reconnect icerir; durum cubukta gosterilir.
export function PreviewLiveSync({ slug, locale }: { slug: string; locale: string }): ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "open" | "reconnecting">("connecting");
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // withCredentials: SSE ucu kimlik dogruluyor (httpOnly cookie). Giris yapmamis
    // izleyicide baglanti reddedilir -> zarif dusus (durum: reconnecting), sayfa calisir.
    const es = new EventSource(`${API}/api/events/content`, { withCredentials: true });
    esRef.current = es;
    es.onopen = () => setStatus("open");
    es.onerror = () => setStatus("reconnecting"); // EventSource kendisi tekrar baglanir
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data as string) as ContentEvent;
        // yalniz bu sayfanin icerigi degistiyse tazele
        if (e.slug === slug && (!e.localeCode || e.localeCode === locale)) {
          const blocks = e.changedBlocks?.length ? ` · ${[...new Set(e.changedBlocks)].join(", ")}` : "";
          setLastEvent(`${e.action}${blocks} · ${new Date(e.at).toLocaleTimeString("tr-TR")}`);
          router.refresh();
        }
      } catch {
        // bozuk event yutulur
      }
    };
    return () => es.close();
  }, [slug, locale, router]);

  const dot =
    status === "open" ? "bg-green-400" : status === "connecting" ? "bg-amber-400" : "bg-red-400";
  return (
    <span className="ml-3 inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {status === "open"
        ? lastEvent
          ? `canlı — son: ${lastEvent}`
          : "canlı senkron açık"
        : status === "connecting"
          ? "bağlanıyor…"
          : "yeniden bağlanıyor…"}
    </span>
  );
}
