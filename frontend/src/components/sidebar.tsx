"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE">;
};

const navItems: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: "⬜", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/cursos", label: "Cursos", icon: "📚", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/calificaciones", label: "Calificaciones", icon: "📊", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/exams", label: "Exámenes", icon: "📝", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/content", label: "Material", icon: "📁", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/users", label: "Usuarios", icon: "👥", roles: ["ADMIN"] },
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
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
