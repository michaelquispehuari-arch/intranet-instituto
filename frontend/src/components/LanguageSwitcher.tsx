"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/types";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <select
      className={`lang-switcher${className ? ` ${className}` : ""}`}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label={t("nav.idioma")}
    >
      {LOCALES.map((code) => (
        <option key={code} value={code}>
          {LOCALE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
