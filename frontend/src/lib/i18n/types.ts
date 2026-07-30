export type Locale = "es" | "en" | "ko";

export const LOCALES: Locale[] = ["es", "en", "ko"];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  en: "English",
  ko: "한국어",
};

export const DEFAULT_LOCALE: Locale = "es";

/** Locale BCP-47 usado para `Intl.DateTimeFormat`/`toLocaleDateString` según el idioma activo. */
export const INTL_LOCALES: Record<Locale, string> = {
  es: "es-PE",
  en: "en-US",
  ko: "ko-KR",
};
