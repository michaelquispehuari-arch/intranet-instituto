import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="login-page">
      <section className="panel login-panel">
        <h1>Nueva contrasena</h1>
        <p className="muted">Crea una contrasena segura para tu cuenta.</p>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="error">Token no encontrado</p>
        )}
        <Link className="text-link login-footer-link" href="/login">
          Volver al login
        </Link>
      </section>
    </main>
  );
}
