"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "../../../components/app-shell";

type Sesion = {
  id: string;
  fecha: string;
  titulo: string;
  enlaceGrabacion: string | null;
  orden: number;
};

type Curso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  ciclo: number;
  anio: number;
  profesor: { id: string; nombre: string; apellido: string };
};

type Tab = "sesiones" | "material" | "examenes" | "notas" | "alumnos";

const TIPO_LABEL: Record<string, string> = {
  REGULAR: "Curso Regular",
  ENTRENAMIENTO: "Entrenamiento",
  ESPECIAL: "Especial",
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function CourseWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [curso, setCurso] = useState<Curso | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [enlaceZoom, setEnlaceZoom] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sesiones");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/backend/courses/${id}`).then((r) => r.json()),
      fetch(`/api/backend/courses/${id}/sessions`).then((r) => r.json()),
      fetch("/api/backend/config/zoom").then((r) => r.json()),
    ]).then(([cursoData, sesionesData, zoomData]) => {
      setCurso(cursoData);
      setSesiones(Array.isArray(sesionesData) ? sesionesData : []);
      setEnlaceZoom(zoomData?.enlaceZoom ?? null);
      setLoading(false);
    });
  }, [id]);

  const today = new Date().toDateString();

  const tabs: { key: Tab; label: string }[] = [
    { key: "sesiones", label: "Sesiones" },
    { key: "material", label: "Material" },
    { key: "examenes", label: "Exámenes" },
    { key: "notas", label: "Notas" },
    { key: "alumnos", label: "Alumnos" },
  ];

  if (loading) {
    return (
      <AppShell>
        <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>
      </AppShell>
    );
  }

  if (!curso) {
    return (
      <AppShell>
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">Curso no encontrado</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Topbar del curso */}
      <div className="course-topbar" style={{ margin: "-28px -32px 0", position: "sticky", top: 0, zIndex: 10 }}>
        <div className="course-topbar-left">
          <Link href="/cursos" style={{ fontSize: 12, color: "var(--texto-tenue)", marginBottom: 2, display: "block" }}>
            ← Cursos
          </Link>
          <span className="course-topbar-eyebrow">{TIPO_LABEL[curso.tipo] ?? curso.tipo}</span>
          <h1 className="course-topbar-title">{curso.nombre}</h1>
        </div>
        {enlaceZoom && (
          <a href={enlaceZoom} target="_blank" rel="noopener noreferrer" className="zoom-button">
            🎥 Unirse a Zoom
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="workspace-tabs" style={{ margin: "0 -32px", marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`workspace-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido de Sesiones */}
      {tab === "sesiones" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Clases de la semana
            </h2>
            {session?.user?.rol === "ADMIN" && (
              <Link href={`/cursos/${id}/sesiones/nueva`} className="btn btn-primary">
                + Nueva sesión
              </Link>
            )}
          </div>

          {sesiones.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <p className="empty-state-title">Sin sesiones programadas</p>
                <p>Aún no hay clases creadas para este curso.</p>
              </div>
            </div>
          )}

          <div className="session-list">
            {sesiones.map((sesion) => {
              const fecha = new Date(sesion.fecha);
              const esHoy = fecha.toDateString() === today;

              return (
                <Link
                  key={sesion.id}
                  href={`/cursos/${id}/sesiones/${sesion.id}`}
                  className={`session-card${esHoy ? " today" : ""}`}
                >
                  <div className="session-date">
                    <div className="session-date-day">{fecha.getDate()}</div>
                    <div className="session-date-month">{MESES[fecha.getMonth()]}</div>
                  </div>

                  <div className="session-info">
                    <div className="session-title">{sesion.titulo}</div>
                    <div className="session-chips">
                      {esHoy && (
                        <span className="chip chip-ok">Hoy</span>
                      )}
                      {sesion.enlaceGrabacion && (
                        <span className="chip chip-grabacion">🎬 Grabación</span>
                      )}
                    </div>
                  </div>

                  <span className="session-chevron">›</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {tab === "material" && (
        <div className="card">
          <div className="card-header">
            <h3>Material del curso</h3>
            {(session?.user?.rol === "ADMIN" || session?.user?.rol === "PROFESOR") && (
              <Link href={`/content/upload?cursoId=${id}`} className="btn btn-primary">
                + Subir material
              </Link>
            )}
          </div>
          <div className="card-body">
            <p style={{ color: "var(--texto-secundario)", margin: 0 }}>
              <Link href={`/content?cursoId=${id}`} style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
                Ver todo el material de este curso →
              </Link>
            </p>
          </div>
        </div>
      )}

      {tab === "examenes" && (
        <div className="card">
          <div className="card-header">
            <h3>Exámenes</h3>
            {(session?.user?.rol === "ADMIN" || session?.user?.rol === "PROFESOR") && (
              <Link href={`/exams/create?cursoId=${id}`} className="btn btn-primary">
                + Crear examen
              </Link>
            )}
          </div>
          <div className="card-body">
            <Link href={`/exams?cursoId=${id}`} style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver exámenes del curso →
            </Link>
          </div>
        </div>
      )}

      {tab === "notas" && (
        <div className="card">
          <div className="card-header">
            <h3>Calificaciones</h3>
          </div>
          <div className="card-body">
            <Link href={`/grades?cursoId=${id}`} style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver calificaciones del curso →
            </Link>
          </div>
        </div>
      )}

      {tab === "alumnos" && (
        <div className="card">
          <div className="card-header">
            <h3>Alumnos matriculados</h3>
            {session?.user?.rol === "ADMIN" && (
              <Link href={`/courses?id=${id}`} className="btn btn-secondary">
                Gestionar matrículas
              </Link>
            )}
          </div>
          <div className="card-body">
            <Link href={`/courses`} style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver en gestión de cursos →
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
