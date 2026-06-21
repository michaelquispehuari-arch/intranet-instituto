"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  labelByRole?: Partial<Record<"ADMIN" | "PROFESOR" | "ESTUDIANTE", string>>;
  icon: string;
  roles: Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE">;
};

const navItems: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: "⬜", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  {
    href: "/cursos",
    label: "Cursos",
    labelByRole: { PROFESOR: "Mi curso", ESTUDIANTE: "Mi curso" },
    icon: "📚",
    roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  },
  {
    href: "/calificaciones",
    label: "Calificaciones",
    labelByRole: { ESTUDIANTE: "Mis notas" },
    icon: "📊",
    roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  },
  { href: "/estudiantes", label: "Estudiantes", icon: "🎓", roles: ["ADMIN"] },
  { href: "/profesores", label: "Profesores", icon: "👨‍🏫", roles: ["ADMIN"] },
  { href: "/sustitutorios", label: "Sustitutorios", icon: "🔄", roles: ["ADMIN"] },
  { href: "/configuracion", label: "Configuración", icon: "⚙️", roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rol = session?.user?.rol as "ADMIN" | "PROFESOR" | "ESTUDIANTE" | undefined;
  const [open, setOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !rol || item.roles.includes(rol));

  return (
    <>
      {/* Hamburger button — solo visible en móvil */}
      <button
        className="sidebar-hamburger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay oscuro en móvil cuando el sidebar está abierto */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Instituto</span>
          <span className="sidebar-brand-sub">Plataforma educativa</span>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = (rol && item.labelByRole?.[rol]) ?? item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {session?.user && (
            <>
              <span className="sidebar-footer-user">
                {session.user.nombre} {session.user.apellido}
              </span>
              <button className="sidebar-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
