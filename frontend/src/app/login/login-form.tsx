"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { PrivacyModal } from "./PrivacyModal";

export function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/inicio";
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (!result?.ok) {
      setError(t("auth.login.invalidCredentials"));
      return;
    }

    router.replace(result.url ?? "/inicio");
    router.refresh();
  }

  return (
    <>
      <form className="login__form stagger" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">{t("auth.login.emailLabel")}</label>
          <div className="input-wrap">
            <Mail className="lead-icon" aria-hidden />
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder={t("auth.login.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">{t("auth.login.passwordLabel")}</label>
          <div className="input-wrap">
            <Lock className="lead-icon" aria-hidden />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="input input--with-trail"
              placeholder={t("auth.login.passwordPlaceholder")}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="trail-icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </button>
          </div>
        </div>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--block btn--lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="btn-loading">
              <span className="spinner-sm" aria-hidden="true" />
              {t("auth.login.signingIn")}
            </span>
          ) : (
            t("auth.login.signIn")
          )}
        </button>

        <div className="login__links">
          <button
            type="button"
            className="login__legal"
            onClick={() => setShowPrivacy(true)}
          >
            {t("auth.login.privacyPolicy")}
          </button>
        </div>
      </form>

      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
