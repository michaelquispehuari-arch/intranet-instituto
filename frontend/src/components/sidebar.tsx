"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
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
  { href: "/inicio",         label: "Inicio",          Icon: Home,         roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/cursos",         label: "Cursos",          labelByRole: { PROFESOR: "Mi curso", ESTUDIANTE: "Mi curso" },
                                                        Icon: BookOpen,     roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/exams",          label: "Exámenes",        Icon: FileText,     roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/calificaciones", label: "Calificaciones",  labelByRole: { ESTUDIANTE: "Mis notas" },
                                                        Icon: BarChart3,    roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  { href: "/estudiantes",    label: "Estudiantes",     Icon: Users,        roles: ["ADMIN"] },
  { href: "/profesores",     label: "Profesores",      Icon: GraduationCap, roles: ["ADMIN"] },
  { href: "/sustitutorios",  label: "Sustitutorios",   Icon: RefreshCw,    roles: ["ADMIN"] },
  { href: "/configuracion",  label: "Configuración",   Icon: Settings,     roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const rol = session?.user?.rol as Role | undefined;
  const [open, setOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !rol || item.roles.includes(rol));

  const initials = session?.user
    ? `${session.user.nombre?.[0] ?? ""}${session.user.apellido?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        {/* Marca */}
        <div className="sidebar-brand">
          <Image
            src="/brand/logo-perts.png"
            alt="PeRTS"
            width={32}
            height={32}
            className="sidebar-logo"
          />
          <span className="sidebar-brand-name">PeRTS</span>
        </div>

        {/* Navegación */}
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const label = (rol && item.labelByRole?.[rol]) ?? item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <item.Icon size={18} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        {session?.user && (
          <div className="sidebar-footer">
            <div className="sidebar-user-row">
              <span className="sidebar-avatar" aria-hidden="true">{initials}</span>
              <span className="sidebar-footer-user">
                {session.user.nombre} {session.user.apellido}
              </span>
            </div>
            <button
              className="sidebar-logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
