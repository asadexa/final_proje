import type { EntryList, PublicEntry } from "./types";

// Sunucu tarafi (SSR/ISR) API tabani: docker network ici 'api', yoksa public.
const API_BASE =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

// Next 16: fetch varsayilan cache'siz; revalidate + tags ile ISR (publish'te revalidateTag).
async function apiGet<T>(path: string, tags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      next: { revalidate: 60, tags },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getEntry(locale: string, slug: string): Promise<PublicEntry | null> {
  return apiGet<PublicEntry>(`/content/${locale}/${slug}`, [
    "content",
    `entry:${locale}:${slug}`,
  ]);
}

// Onizleme: cache'siz (taslak icerik anlik gorulmeli).
async function apiGetNoStore<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function getPreviewEntry(
  locale: string,
  slug: string,
  token: string,
): Promise<PublicEntry | null> {
  return apiGetNoStore<PublicEntry>(
    `/content/preview/${locale}/${slug}?token=${encodeURIComponent(token)}`,
  );
}

export function listEntries(
  locale: string,
  type: string,
  page = 1,
): Promise<EntryList | null> {
  return apiGet<EntryList>(`/content/${locale}?type=${type}&page=${page}`, [
    "content",
    `list:${locale}:${type}`,
  ]);
}

// Sitemap icin: tum yayindaki icerikler (tip filtresiz, tek sayfada).
export function listAllEntries(locale: string, pageSize = 1000): Promise<EntryList | null> {
  return apiGet<EntryList>(`/content/${locale}?pageSize=${pageSize}`, [
    "content",
    `list:${locale}:all`,
  ]);
}
