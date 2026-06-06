// API public yanitlari icin hafif tipler (no any).

export interface BlockNode {
  id: string;
  type: string;
  order: number;
  data: Record<string, unknown>;
}

export interface SeoData {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
  keywords?: string[];
}

export interface Alternate {
  localeCode: string;
  slug: string;
}

export type EntryType = "PAGE" | "PRODUCT" | "POST";

export interface PublicEntry {
  id: string;
  type: EntryType;
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  blocks: BlockNode[];
  seo?: SeoData | null;
  alternates?: Alternate[];
  product?: { tagline?: string | null } | null;
  post?: { readingMin?: number | null; tags?: string[] } | null;
}

export interface EntryListItem {
  id: string;
  type: EntryType;
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  groupId?: string;
  seo?: SeoData | null;
}

export interface EntryList {
  items: EntryListItem[];
  total: number;
  page: number;
  pageSize: number;
}
