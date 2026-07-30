"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordContent({ token }: { token?: string }) {
  const { t } = useTranslation();

  return (
    <section className="panel login-panel">
      <h1>{t("auth.resetPassword.title")}</h1>
      <p className="muted">{t("auth.resetPassword.subtitle")}</p>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="error">{t("auth.resetPassword.tokenNotFound")}</p>
      )}
      <Link className="text-link login-footer-link" href="/login">
        {t("auth.resetPassword.backToLogin")}
      </Link>
    </section>
  );
}
