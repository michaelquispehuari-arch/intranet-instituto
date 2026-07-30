"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("privacy.ariaLabel")}
      onClick={onClose}
    >
      <div className="modal pop-in privacy" onClick={(e) => e.stopPropagation()}>
        <header className="privacy__head">
          <h2 className="h3">{t("privacy.title")}</h2>
          <button
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            aria-label={t("privacy.close")}
            type="button"
          >
            <X />
          </button>
        </header>

        <div className="privacy__body">
          <p>{t("privacy.responsible")}</p>

          <p><strong>{t("privacy.s1Title")}</strong> {t("privacy.s1Text")}</p>

          <p><strong>{t("privacy.s2Title")}</strong> {t("privacy.s2Text")}</p>

          <p><strong>{t("privacy.s3Title")}</strong> {t("privacy.s3Text")}</p>

          <p><strong>{t("privacy.s4Title")}</strong> {t("privacy.s4Text")}</p>

          <p><strong>{t("privacy.s5Title")}</strong> {t("privacy.s5Text")}</p>

          <p><strong>{t("privacy.s6Title")}</strong> {t("privacy.s6Text")}</p>

          <p className="privacy__updated">{t("privacy.updated")}</p>
        </div>
      </div>
    </div>
  );
}
