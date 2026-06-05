import tr from "@/dictionaries/tr.json";
import en from "@/dictionaries/en.json";

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";

// Ana sayfanin dile gore slug'i (gercek krontech: /tr/anasayfa, /home).
// Home rotasi /[locale] koktur; ic cozumleme bu slug'i kullanir.
export const HOME_SLUGS: Record<Locale, string> = { tr: "anasayfa", en: "home" };

const dictionaries = { tr, en } as const;
export type Dictionary = typeof tr;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
