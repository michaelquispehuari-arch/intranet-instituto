"use client";

import Link from "next/link";
import {
  BookOpen, BarChart3, Users, GraduationCap, RefreshCw,
  Settings, FileText, Video, ArrowRight, CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { SectionHead } from "@/components/ui/SectionHead";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTranslation } from "@/lib/i18n/LanguageContext";

type Curso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
  profesor: { nombre: string; apellido: string };
};

const adminItems = [
  { href: "/cursos",         navKey: "nav.cursos",         descKey: "inicio.admin.itemDesc.cursos",         Icon: BookOpen },
  { href: "/calificaciones", navKey: "nav.calificaciones", descKey: "inicio.admin.itemDesc.calificaciones", Icon: BarChart3 },
  { href: "/exams",          navKey: "nav.examenes",       descKey: "inicio.admin.itemDesc.examenes",       Icon: FileText },
  { href: "/estudiantes",    navKey: "nav.estudiantes",    descKey: "inicio.admin.itemDesc.estudiantes",    Icon: Users },
  { href: "/profesores",     navKey: "nav.profesores",     descKey: "inicio.admin.itemDesc.profesores",     Icon: GraduationCap },
  { href: "/sustitutorios",  navKey: "nav.sustitutorios",  descKey: "inicio.admin.itemDesc.sustitutorios",  Icon: RefreshCw },
  { href: "/configuracion",  navKey: "nav.configuracion",  descKey: "inicio.admin.itemDesc.configuracion",  Icon: Settings },
] as const;

export function InicioContent({
  rol,
  nombre,
  cursosActivos,
  totalCursos,
  enlaceZoom,
}: {
  rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  nombre: string;
  cursosActivos: Curso[];
  totalCursos: number;
  enlaceZoom: string | null;
}) {
  const { t } = useTranslation();

  if (rol === "ADMIN") {
    return (
      <div>
        <SectionHead
          eyebrow={t("inicio.admin.eyebrow")}
          title={t("inicio.greeting", { nombre })}
          description={t("inicio.admin.description")}
        />

        <div className="stat-grid stagger" style={{ marginBottom: "var(--s-8)" }}>
          <div className="stat-card">
            <div className="stat-card-label">{t("inicio.admin.activeCourses")}</div>
            <div className="stat-card-value">{cursosActivos.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">{t("inicio.admin.totalCourses")}</div>
            <div className="stat-card-value">{totalCursos}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Zoom</div>
            <div className="stat-card-value stat-card-zoom">
              {enlaceZoom
                ? <><CheckCircle2 size={18} aria-hidden /> {t("inicio.admin.zoomConfigured")}</>
                : <span style={{ color: "var(--ink-mute)", fontSize: "1rem" }}>{t("inicio.admin.zoomNotConfigured")}</span>
              }
            </div>
          </div>
        </div>

        <h2 className="h3" style={{ margin: "0 0 var(--s-4)" }}>{t("inicio.admin.quickAccess")}</h2>
        <div className="qa-grid stagger">
          {adminItems.map(({ href, navKey, descKey, Icon }) => (
            <Link key={href} href={href} className="card card--link qa-card">
              <span className="qa-icon" aria-hidden="true"><Icon /></span>
              <span className="qa-body">
                <span className="qa-title">{t(navKey)}</span>
                <span className="qa-desc">{t(descKey)}</span>
              </span>
              <span className="qa-arrow" aria-hidden="true"><ArrowRight /></span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (rol === "PROFESOR") {
    const miCurso = cursosActivos[0] ?? null;
    return (
      <div>
        <SectionHead
          eyebrow={t("inicio.profesor.eyebrow")}
          title={t("inicio.greeting", { nombre })}
          description={t("inicio.profesor.description")}
        />

        {enlaceZoom && (
          <a
            href={enlaceZoom}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--accent"
            style={{ marginBottom: "var(--s-6)", display: "inline-flex" }}
          >
            <Video size={18} aria-hidden /> {t("inicio.joinClass")}
          </a>
        )}

        {miCurso ? (
          <>
            <Link href={`/cursos/${miCurso.id}`} className="card card--link" style={{ display: "block", marginBottom: "var(--s-4)" }}>
              <span className="chip chip--ok" style={{ marginBottom: "var(--s-3)", display: "inline-flex" }}>
                <CheckCircle2 size={13} aria-hidden /> {t("inicio.activeCourseChip")}
              </span>
              <h2 className="h2" style={{ margin: "0 0 var(--s-2)" }}>{miCurso.nombre}</h2>
              <p className="small" style={{ margin: "0 0 var(--s-3)" }}>
                {miCurso.descripcion ?? t("inicio.defaultCourseDesc")}
              </p>
              <span className="small">
                {t("inicio.profTag", { nombre: miCurso.profesor.nombre, apellido: miCurso.profesor.apellido })}
              </span>
            </Link>

            {cursosActivos.length > 1 && (
              <Link href="/cursos" className="btn btn--ghost btn--sm" style={{ display: "inline-flex", marginBottom: "var(--s-6)" }}>
                {t("inicio.viewMyCourses", { count: cursosActivos.length })} <ArrowRight size={16} aria-hidden />
              </Link>
            )}
          </>
        ) : (
          <div className="card" style={{ marginBottom: "var(--s-6)" }}>
            <EmptyState
              icon={<CalendarDays size={32} />}
              title={t("inicio.noCourseProfesor.title")}
              description={t("inicio.noCourseProfesor.description")}
            />
          </div>
        )}
      </div>
    );
  }

  const miCurso = cursosActivos[0] ?? null;

  return (
    <div>
      <SectionHead
        eyebrow={t("inicio.estudiante.eyebrow")}
        title={t("inicio.greeting", { nombre })}
        description={t("inicio.estudiante.description")}
      />

      {enlaceZoom && (
        <a
          href={enlaceZoom}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--accent"
          style={{ marginBottom: "var(--s-6)", display: "inline-flex" }}
        >
          <Video size={18} aria-hidden /> {t("inicio.joinClass")}
        </a>
      )}

      {miCurso ? (
        <>
          <Link href={`/cursos/${miCurso.id}`} className="card card--link" style={{ display: "block", marginBottom: "var(--s-6)" }}>
            <span className="chip chip--ok" style={{ marginBottom: "var(--s-3)", display: "inline-flex" }}>
              <CheckCircle2 size={13} aria-hidden /> {t("inicio.activeCourseChip")}
            </span>
            <h2 className="h2" style={{ margin: "0 0 var(--s-2)" }}>{miCurso.nombre}</h2>
            <p className="small" style={{ margin: "0 0 var(--s-3)" }}>
              {miCurso.descripcion ?? "—"}
            </p>
            <span className="small">
              {t("inicio.profTag", { nombre: miCurso.profesor.nombre, apellido: miCurso.profesor.apellido })}
            </span>
          </Link>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={32} />}
            title={t("inicio.noCourseEstudiante.title")}
            description={t("inicio.noCourseEstudiante.description")}
          />
        </div>
      )}
    </div>
  );
}
