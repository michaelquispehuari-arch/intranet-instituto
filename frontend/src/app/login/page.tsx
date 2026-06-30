import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/inicio");
  }

  return (
    <main className="login">
      <header className="brand-band login__band">
        <Image
          src="/brand/flag-mascot.png"
          alt=""
          width={40}
          height={62}
          className="login__flag"
          priority
          aria-hidden="true"
        />
        <span className="login__brandtext">Seminario Teológico de Remanentes</span>
      </header>

      <div className="login__rule" aria-hidden="true" />

      <section className="login__stage">
        <div className="card login__card pop-in">
          <div className="login__logo">
            <Image
              src="/brand/logo-perts.png"
              alt="Logo PeRTS"
              width={96}
              height={96}
              priority
            />
          </div>
          <h1 className="display-l login__title">Intranet PeRTS</h1>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
