"use client";
// starter/login-page.tsx — MOLDE de la pantalla de login PeRTS (referencia imagen 1).
// Cópialo a frontend/src/app/login/page.tsx y conecta el signIn de NextAuth donde se indica.
// Requiere: lucide-react, las clases de tokens.css + base.css, e imágenes en /public/brand/.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { Button } from "./Button";
// import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // ── Conecta tu NextAuth aquí ──────────────────────────────
      // const res = await signIn("credentials", { email, password, redirect: false });
      // if (res?.error) { setError("Correo o contraseña incorrectos."); return; }
      // router.push("/inicio");
      // ──────────────────────────────────────────────────────────
      await new Promise((r) => setTimeout(r, 800)); // demo
      setError("Correo o contraseña incorrectos."); // demo
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      {/* Banda de marca (signature) */}
      <header className="brand-band login__band">
        <Image src="/brand/flag-mascot.png" alt="" width={40} height={62}
          className="login__flag" priority />
        <span className="login__brandtext">Seminario Teológico de Remanentes</span>
      </header>

      {/* Card de acceso sobre degradado verde */}
      <section className="login__stage brand-gradient">
        <div className="card login__card pop-in">
          <div className="login__logo">
            <Image src="/brand/logo-perts.png" alt="PeRTS" width={96} height={96} priority />
          </div>
          <h1 className="display-l login__title">Intranet PeRTS</h1>
          <p className="small login__sub">Acceso para estudiantes, profesores y administradores.</p>

          <form onSubmit={onSubmit} className="login__form stagger" noValidate>
            <div className="field">
              <label className="label" htmlFor="email">Correo</label>
              <div className="input-wrap">
                <Mail className="lead-icon" aria-hidden />
                <input id="email" type="email" className="input" placeholder="tucorreo@instituto.edu"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Contraseña</label>
              <div className="input-wrap">
                <Lock className="lead-icon" aria-hidden />
                <input id="password" type="password" className="input" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" required />
              </div>
            </div>

            {error && <p className="field-error" role="alert">{error}</p>}

            <Button type="submit" block loading={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>

            <div className="login__links">
              <Link href="/forgot-password">Olvidé mi contraseña</Link>
              <span aria-hidden>·</span>
              <Link href="/privacy">Política de privacidad</Link>
            </div>
          </form>
        </div>

        <p className="login__lemma">The Spiritual Emperor That Saved Emperors · Ge 41:38</p>
      </section>
    </main>
  );
}

/* ── CSS de esta pantalla (mételo en login.module.css o globals.css) ──
.login{min-height:100dvh;display:flex;flex-direction:column}
.login__band{display:flex;align-items:center;gap:14px;padding:18px 28px;
  border-bottom:1px solid rgba(255,255,255,.08)}
.login__flag{height:42px;width:auto}
.login__brandtext{color:#E7EDEA;font:italic 500 1.05rem/1 var(--font-display);letter-spacing:.01em}
.login__stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:18px;padding:48px 20px}
.login__card{width:100%;max-width:400px;text-align:center;padding:36px 32px}
.login__logo{display:flex;justify-content:center;margin-bottom:14px}
.login__logo img{width:84px;height:84px}
.login__title{color:var(--pine-700);margin:0 0 4px}
.login__sub{margin:0 0 22px}
.login__form{display:flex;flex-direction:column;gap:16px;text-align:left}
.login__links{display:flex;gap:10px;justify-content:center;align-items:center;margin-top:4px}
.login__links a{color:var(--pine-600);font-size:.85rem;text-decoration:none}
.login__links a:hover{text-decoration:underline}
.login__lemma{color:rgba(255,255,255,.75);font:400 .8rem/1.4 var(--font-body);text-align:center}
@media (max-width:480px){.login__card{padding:28px 22px}}
─────────────────────────────────────────────────────────────────── */
