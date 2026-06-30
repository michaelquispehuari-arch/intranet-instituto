"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { PrivacyModal } from "./PrivacyModal";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/inicio";
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.replace(result.url ?? "/inicio");
    router.refresh();
  }

  return (
    <>
      <form className="login__form stagger" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Correo</label>
          <div className="input-wrap">
            <Mail className="lead-icon" aria-hidden />
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="correo@gmail.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Contraseña</label>
          <div className="input-wrap">
            <Lock className="lead-icon" aria-hidden />
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Tu contraseña"
              autoComplete="current-password"
              required
            />
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
              Ingresando…
            </span>
          ) : (
            "Ingresar"
          )}
        </button>

        <div className="login__links">
          <button
            type="button"
            className="login__legal"
            onClick={() => setShowPrivacy(true)}
          >
            Política de privacidad
          </button>
        </div>
      </form>

      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
