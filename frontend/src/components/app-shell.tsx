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

type Role = "ADMIN" | "PROFESOR" | "ESTUDIANTE";

type NavItem = {
  href: string;
  label: string;
  labelByRole?: Partial<Record<Role, string>>;
  Icon: LucideIcon;
  roles: Role[];
};

const navItems: NavItem[] = [
  { href: "/inicio",         label: "Inicio",         Icon: Home,          roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/cursos",         label: "Cursos",         Icon: BookOpen,      roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
    labelByRole: { PROFESOR: "Mi curso", ESTUDIANTE: "Mi curso" } },
  { href: "/exams",          label: "Exámenes",       Icon: FileText,      roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/calificaciones", label: "Calificaciones", Icon: BarChart3,     roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
    labelByRole: { ESTUDIANTE: "Mis notas" } },
  { href: "/estudiantes",    label: "Estudiantes",    Icon: Users,         roles: ["ADMIN"] },
  { href: "/profesores",     label: "Profesores",     Icon: GraduationCap, roles: ["ADMIN"] },
  { href: "/sustitutorios",  label: "Sustitutorios",  Icon: RefreshCw,     roles: ["ADMIN"] },
  { href: "/configuracion",  label: "Configuración",  Icon: Settings,      roles: ["ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const rol = session?.user?.rol as Role | undefined;
  const visible = navItems.filter(item => !rol || item.roles.includes(rol));

  const currentItem = visible.find(
    item => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const pageTitle = currentItem
    ? (rol && currentItem.labelByRole?.[rol]) ?? currentItem.label
    : "";

  const initials = session?.user
    ? `${session.user.nombre?.[0] ?? ""}${session.user.apellido?.[0] ?? ""}`.toUpperCase()
    : "";

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
        <div className="rail__logo">
          <Image src="/brand/logo-perts.png" alt="PeRTS" width={96} height={96} priority />
        </div>

        <nav className="rail__nav" aria-label="Navegación principal">
          {visible.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = (rol && item.labelByRole?.[rol]) ?? item.label;
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

        <div className="rail__spacer" />

        {/* Usuario + logout */}
        {session?.user && (
          <div className="rail__footer">
            <div className="rail__user">
              <span className="rail__avatar" aria-hidden="true">{initials}</span>
              <span className="rail__username">
                {session.user.nombre} {session.user.apellido}
              </span>
            </div>
            <button
              className="rail__logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        )}

        {/* Mascota "R" pegada abajo */}
        <div className="rail__mascot">
          <Image
            src="/brand/flag-mascot.png"
            alt=""
            width={110}
            height={170}
            aria-hidden="true"
          />
        </div>
      </aside>

      {/* ── Contenido derecho: blanco + textura ── */}
      <main className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              className="topbar__menu-btn"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            {pageTitle && <span className="topbar__title">{pageTitle}</span>}
          </div>
          <div className="topbar__right">
            <span className="topbar__username">{session?.user?.nombre} {session?.user?.apellido}</span>
            <span className="topbar__avatar" aria-hidden="true">{initials}</span>
          </div>
        </header>

        <div className="shell__content">
          {children}
        </div>
      </main>
    </div>
  );
}
