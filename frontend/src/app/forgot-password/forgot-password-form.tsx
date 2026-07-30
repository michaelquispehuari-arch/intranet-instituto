"use client";

import { FormEvent, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") }),
    });
    const data = (await response.json()) as { message?: string };

    setIsLoading(false);

    if (!response.ok) {
      setError(data.message ?? t("auth.forgotPassword.genericError"));
      return;
    }

    setMessage(data.message ?? t("auth.forgotPassword.requestProcessed"));
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">{t("auth.forgotPassword.emailLabel")}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <button className="button" type="submit" disabled={isLoading}>
        {isLoading ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendLink")}
      </button>
    </form>
  );
}
