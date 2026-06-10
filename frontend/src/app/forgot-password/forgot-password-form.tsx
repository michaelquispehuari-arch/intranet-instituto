"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
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
      setError(data.message ?? "No se pudo procesar la solicitud");
      return;
    }

    setMessage(data.message ?? "Solicitud procesada");
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Correo institucional</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}
      <button className="button" type="submit" disabled={isLoading}>
        {isLoading ? "Enviando..." : "Enviar enlace"}
      </button>
    </form>
  );
}
