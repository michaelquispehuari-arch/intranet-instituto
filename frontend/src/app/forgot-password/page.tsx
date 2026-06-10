import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="login-page">
      <section className="panel login-panel">
        <h1>Recuperar acceso</h1>
        <p className="muted">Ingresa tu correo institucional.</p>
        <ForgotPasswordForm />
        <Link className="text-link login-footer-link" href="/login">
          Volver al login
        </Link>
      </section>
    </main>
  );
}
