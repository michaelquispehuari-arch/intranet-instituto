"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

type CourseResponse = {
  course?: Curso;
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
  const [recordingDrafts, setRecordingDrafts] = useState<Record<string, string>>({});
  const [savingRecordingId, setSavingRecordingId] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({ titulo: "", fecha: "", enlaceGrabacion: "" });
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/backend/courses/${id}`).then((r) => r.json()),
      fetch(`/api/backend/courses/${id}/sessions`).then((r) => r.json()),
      fetch("/api/backend/config/zoom").then((r) => r.json()),
    ]).then(([cursoData, sesionesData, zoomData]: [CourseResponse, Sesion[], { enlaceZoom?: string }]) => {
      const loadedSessions = Array.isArray(sesionesData) ? sesionesData : [];
      setCurso(cursoData.course ?? null);
      setSesiones(loadedSessions);
      setRecordingDrafts(
        Object.fromEntries(loadedSessions.map((sesion) => [sesion.id, sesion.enlaceGrabacion ?? ""])),
      );
      setEnlaceZoom(zoomData?.enlaceZoom ?? null);
      setLoading(false);
    });
  }, [id]);

  const today = new Date().toDateString();
  const canManageRecordings = session?.user?.rol === "ADMIN" || session?.user?.rol === "PROFESOR";
  const canCreateSessions = session?.user?.rol === "ADMIN";

  async function saveSessionRecording(sesionId: string) {
    setSavingRecordingId(sesionId);
    const enlaceGrabacion = recordingDrafts[sesionId] ?? "";
    const response = await fetch(`/api/backend/sessions/${sesionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enlaceGrabacion }),
    });
    setSavingRecordingId(null);

    if (!response.ok) return;

    setSesiones((current) =>
      current.map((sesion) =>
        sesion.id === sesionId ? { ...sesion, enlaceGrabacion: enlaceGrabacion.trim() || null } : sesion,
      ),
    );
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingSession(true);
    const nextOrder = Math.max(0, ...sesiones.map((sesion) => sesion.orden)) + 1;
    const response = await fetch(`/api/backend/courses/${id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: newSession.titulo,
        fecha: newSession.fecha,
        orden: nextOrder,
        enlaceGrabacion: newSession.enlaceGrabacion,
      }),
    });
    setCreatingSession(false);

    if (!response.ok) return;

    const created = (await response.json()) as Sesion;
    setSesiones((current) => [...current, created].sort((a, b) => a.orden - b.orden));
    setRecordingDrafts((current) => ({ ...current, [created.id]: created.enlaceGrabacion ?? "" }));
    setNewSession({ titulo: "", fecha: "", enlaceGrabacion: "" });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "sesiones", label: "Sesiones" },
    { key: "material", label: "Material" },
    { key: "examenes", label: "Exámenes" },
    { key: "notas", label: "Notas" },
    { key: "alumnos", label: "Alumnos" },
  ];

  if (loading) {
    return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;
  }

  if (!curso) {
    return (
      <div className="card">
        <div className="empty-state">
          <p className="empty-state-title">Curso no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div>
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

      {tab === "sesiones" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Clases de la semana</h2>
            {canCreateSessions && <span className="badge">Nueva clase abajo</span>}
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
                <article
                  key={sesion.id}
                  className={`session-card${esHoy ? " today" : ""}`}
                >
                  <div className="session-date">
                    <div className="session-date-day">{fecha.getDate()}</div>
                    <div className="session-date-month">{MESES[fecha.getMonth()]}</div>
                  </div>
                  <div className="session-info">
                    <div className="session-title">{sesion.titulo}</div>
                    {sesion.enlaceGrabacion ? (
                      <a
                        href={sesion.enlaceGrabacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                        style={{ display: "inline-block", marginTop: 8 }}
                      >
                        Ver grabacion
                      </a>
                    ) : (
                      <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
                        Grabacion pendiente.
                      </p>
                    )}
                    {canManageRecordings && (
                      <div className="recording-form">
                        <input
                          aria-label={`Link de grabacion para ${sesion.titulo}`}
                          placeholder="Pegar link de YouTube"
                          value={recordingDrafts[sesion.id] ?? ""}
                          onChange={(event) =>
                            setRecordingDrafts((current) => ({
                              ...current,
                              [sesion.id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          className="btn btn-secondary"
                          type="button"
                          disabled={savingRecordingId === sesion.id}
                          onClick={() => saveSessionRecording(sesion.id)}
                        >
                          {savingRecordingId === sesion.id ? "Guardando..." : "Guardar link"}
                        </button>
                      </div>
                    )}
                    <div className="session-chips">
                      {esHoy && <span className="chip chip-ok">Hoy</span>}
                      {sesion.enlaceGrabacion && <span className="chip chip-grabacion">🎬 Grabación</span>}
                    </div>
                  </div>
                  <Link className="btn btn-secondary" href={`/cursos/${id}/sesiones/${sesion.id}`}>
                    Detalle
                  </Link>
                </article>
              );
            })}
          </div>
          {canCreateSessions && (
            <form className="card form wide-form" onSubmit={createSession} style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Nueva clase</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Titulo</span>
                  <input
                    placeholder={`Clase ${sesiones.length + 1} ${curso.nombre}`}
                    value={newSession.titulo}
                    onChange={(event) => setNewSession((current) => ({ ...current, titulo: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Fecha</span>
                  <input
                    type="datetime-local"
                    value={newSession.fecha}
                    onChange={(event) => setNewSession((current) => ({ ...current, fecha: event.target.value }))}
                    required
                  />
                </label>
                <label className="field full-row">
                  <span>Grabacion</span>
                  <input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={newSession.enlaceGrabacion}
                    onChange={(event) =>
                      setNewSession((current) => ({ ...current, enlaceGrabacion: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="card-actions">
                <button className="btn btn-primary" type="submit" disabled={creatingSession}>
                  {creatingSession ? "Creando..." : "Crear clase"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "material" && (
        <div className="card">
          <div className="card-header">
            <h3>Material del curso</h3>
            {(session?.user?.rol === "ADMIN" || session?.user?.rol === "PROFESOR") && (
              <Link href={`/material/subir?cursoId=${id}`} className="btn btn-primary">
                + Subir material
              </Link>
            )}
          </div>
          <div className="card-body">
            <Link href={`/material?cursoId=${id}`} style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver todo el material de este curso →
            </Link>
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
            {(session?.user?.rol === "ADMIN" || session?.user?.rol === "PROFESOR") && (
              <Link href={`/cursos/${id}/notas`} className="btn btn-primary">
                Abrir grilla de notas
              </Link>
            )}
          </div>
          <div className="card-body">
            <Link href="/calificaciones" style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver cronograma de calificaciones →
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
            <Link href="/courses" style={{ color: "var(--ambar-accion)", fontWeight: 600 }}>
              Ver en gestión de cursos →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
