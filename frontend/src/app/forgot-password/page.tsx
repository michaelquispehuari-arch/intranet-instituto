"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  return (
    <main className="login-page">
      <section className="panel login-panel">
        <h1>{t("auth.forgotPassword.title")}</h1>
        <p className="muted">{t("auth.forgotPassword.subtitle")}</p>
        <ForgotPasswordForm />
        <Link className="text-link login-footer-link" href="/login">
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
