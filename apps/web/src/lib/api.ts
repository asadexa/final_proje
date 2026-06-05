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
