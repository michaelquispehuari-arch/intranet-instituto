"use client";

import { FormEvent, useState } from "react";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await response.json()) as { message?: string };

    setIsLoading(false);

    if (!response.ok) {
      setError(data.message ?? "No se pudo actualizar la contrasena");
      return;
    }

    setMessage(data.message ?? "Contrasena actualizada");
    event.currentTarget.reset();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="password">Nueva contrasena</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirmar contrasena</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <button className="button" type="submit" disabled={isLoading}>
        {isLoading ? "Guardando..." : "Actualizar contrasena"}
      </button>
    </form>
  );
}
