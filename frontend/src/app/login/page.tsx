import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/inicio");
  }

  return (
    <main className="login-page">
      <section className="panel login-panel">
        <h1>Intranet Instituto</h1>
        <p className="muted">Acceso para estudiantes, profesores y administradores.</p>
        <LoginForm />
        <Link className="text-link login-footer-link" href="/privacy">
          Politica de privacidad
        </Link>
      </section>
    </main>
  );
}
