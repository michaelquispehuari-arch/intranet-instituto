"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  Home, BookOpen, BarChart3, Users, GraduationCap,
  RefreshCw, Settings, FileText, Menu, X, LogOut,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Role = "ADMIN" | "PROFESOR" | "ESTUDIANTE";

type NavItem = {
  href: string;
  labelKey: string;
  labelKeyByRole?: Partial<Record<Role, string>>;
  Icon: LucideIcon;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "/inicio",         labelKey: "nav.inicio",         Icon: Home,          roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/cursos",         labelKey: "nav.cursos",         Icon: BookOpen,      roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
    labelKeyByRole: { PROFESOR: "nav.miCurso", ESTUDIANTE: "nav.miCurso" } },
  { href: "/exams",          labelKey: "nav.examenes",       Icon: FileText,      roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/calificaciones", labelKey: "nav.calificaciones", Icon: BarChart3,     roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
    labelKeyByRole: { ESTUDIANTE: "nav.misNotas" } },
  { href: "/estudiantes",    labelKey: "nav.estudiantes",    Icon: Users,         roles: ["ADMIN"] },
  { href: "/profesores",     labelKey: "nav.profesores",     Icon: GraduationCap, roles: ["ADMIN"] },
  { href: "/sustitutorios",  labelKey: "nav.sustitutorios",  Icon: RefreshCw,     roles: ["ADMIN"] },
  { href: "/configuracion",  labelKey: "nav.configuracion",  Icon: Settings,      roles: ["ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const rol = session?.user?.rol as Role | undefined;
  const visible = navItems.filter(item => !rol || item.roles.includes(rol));

  return (
    <div className="shell">
      {/* Overlay móvil */}
      {open && (
        <div
          className="shell__overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Panel izquierdo: degradado verde ── */}
      <aside className={`shell__rail${open ? " is-open" : ""}`}>
        <div className="rail__watermark">
          <Image src="/brand/logo-perts.png" alt="" width={236} height={236} aria-hidden priority />
        </div>

        <div className="rail__nav-wrap">
          <nav className="rail__nav" aria-label={t("nav.navegacionPrincipal")}>
            {visible.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const label = t((rol && item.labelKeyByRole?.[rol]) ?? item.labelKey);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <item.Icon aria-hidden />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Idioma + logout */}
        <div className="rail__footer">
          <LanguageSwitcher />
          {session?.user && (
            <button
              className="rail__logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} aria-hidden />
              {t("nav.cerrarSesion")}
            </button>
          )}
        </div>

        {/* Mascota "R" pegada abajo */}
        <div className="rail__mascot">
          <Image
            src="/brand/flag-mascot.png"
            alt=""
            width={192}
            height={296}
            aria-hidden="true"
          />
        </div>
      </aside>

      {/* ── Contenido derecho: blanco + textura ── */}
      <main className="shell__main">
        <div className="mobile-bar">
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? t("nav.cerrarMenu") : t("nav.abrirMenu")}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="shell__content">
          {children}
        </div>
      </main>
    </div>
  );
}
