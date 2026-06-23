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
  inscripciones?: Array<{ estudiante: { id: string; nombre: string; apellido: string; email: string; codigo?: string | null } }>;
};

type CourseResponse = {
  course?: Curso;
};

type ExamItem = {
  id: string;
  titulo: string;
  descripcion: string | null;
  duracionMinutos: number;
  publicadoEn: string | null;
  disponibleDesde: string | null;
  disponibleHasta: string | null;
  _count: { preguntas: number; envios: number };
};

type AlumnoItem = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  codigo: string | null;
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
  const [exams, setExams] = useState<ExamItem[] | null>(null);
  const [examsLoading, setExamsLoading] = useState(false);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      fetch(`/api/backend/courses/${id}`).then((r) => r.json()),
      fetch(`/api/backend/courses/${id}/sessions`).then((r) => r.json()),
      fetch("/api/backend/config/zoom").then((r) => r.json()),
    ]).then(([cursoData, sesionesData, zoomData]: [CourseResponse, Sesion[], { enlaceZoom?: string }]) => {
      const loadedSessions = Array.isArray(sesionesData) ? sesionesData : [];
      const loadedCourse = cursoData.course ?? null;
      setCurso(loadedCourse);
      setSesiones(loadedSessions);
      setRecordingDrafts(
        Object.fromEntries(loadedSessions.map((sesion) => [sesion.id, sesion.enlaceGrabacion ?? ""])),
      );
      setEnlaceZoom(zoomData?.enlaceZoom ?? null);
      if (loadedCourse?.inscripciones) {
        setAlumnos(loadedCourse.inscripciones.map((i) => ({ ...i.estudiante, codigo: i.estudiante.codigo ?? null })));
      }
      setLoading(false);
    });
  }, [id]);

  const today = new Date().toDateString();
  const rol = session?.user?.rol;
  const canManageRecordings = rol === "ADMIN";
  const canCreateSessions = rol === "ADMIN";

  async function loadExams() {
    if (exams !== null || examsLoading) return;
    setExamsLoading(true);
    const r = await fetch(`/api/backend/exams?cursoId=${id}`);
    if (r.ok) {
      const d = await r.json() as { exams?: ExamItem[] };
      setExams(Array.isArray(d.exams) ? d.exams : []);
    } else {
      setExams([]);
    }
    setExamsLoading(false);
  }

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
    setSessionError(null);
    const nextOrder = Math.max(0, ...sesiones.map((sesion) => sesion.orden)) + 1;
    const response = await fetch(`/api/backend/courses/${id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: newSession.titulo,
        fecha: newSession.fecha ? new Date(newSession.fecha).toISOString() : "",
        orden: nextOrder,
        enlaceGrabacion: newSession.enlaceGrabacion || null,
      }),
    });
    setCreatingSession(false);

    if (!response.ok) {
      const d = await response.json().catch(() => ({})) as { message?: string };
      setSessionError(d.message ?? "Error al crear la clase. Verifica los datos.");
      return;
    }

    const created = (await response.json()) as Sesion;
    setSesiones((current) => [...current, created].sort((a, b) => a.orden - b.orden));
    setRecordingDrafts((current) => ({ ...current, [created.id]: created.enlaceGrabacion ?? "" }));
    setNewSession({ titulo: "", fecha: "", enlaceGrabacion: "" });
  }

  const allTabs: { key: Tab; label: string; roles: Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE"> }[] = [
    { key: "sesiones", label: "Sesiones", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "material", label: "Material", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "examenes", label: "Exámenes", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "notas", label: "Notas", roles: ["ADMIN", "PROFESOR"] },
    { key: "alumnos", label: "Alumnos", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
  ];
  const tabs = allTabs.filter((t) => !rol || t.roles.includes(rol as "ADMIN" | "PROFESOR" | "ESTUDIANTE"));

  function handleTabChange(key: Tab) {
    setTab(key);
    if (key === "examenes") loadExams();
  }

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
            onClick={() => handleTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sesiones" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Clases grabadas</h2>
            {canCreateSessions && <span className="badge">Agrega clases abajo</span>}
          </div>

          {sesiones.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <p className="empty-state-title">Sin grabaciones aún</p>
                <p>{canCreateSessions ? "Agrega la primera clase con su link de YouTube." : "Las grabaciones aparecerán aquí cuando estén disponibles."}</p>
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
              {sessionError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{sessionError}</p>
              )}
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
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Exámenes del curso</h2>
            {(rol === "ADMIN" || rol === "PROFESOR") && (
              <Link href={`/exams/create?cursoId=${id}`} className="btn btn-primary">
                + Crear examen
              </Link>
            )}
          </div>
          {examsLoading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}
          {!examsLoading && exams !== null && exams.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-title">Sin exámenes</p>
                <p>{(rol === "ADMIN" || rol === "PROFESOR") ? "Crea el primer examen para este curso." : "No hay exámenes disponibles aún."}</p>
              </div>
            </div>
          )}
          {!examsLoading && exams && exams.length > 0 && (
            <div className="session-list">
              {exams.map((exam) => {
                const now = new Date();
                const desde = exam.disponibleDesde ? new Date(exam.disponibleDesde) : null;
                const hasta = exam.disponibleHasta ? new Date(exam.disponibleHasta) : null;
                const disponible = exam.publicadoEn && (!desde || desde <= now) && (!hasta || hasta >= now);
                const vencido = hasta && hasta < now;
                const estado = !exam.publicadoEn ? "Borrador" : vencido ? "Vencido" : disponible ? "Disponible" : "Pendiente";
                return (
                  <article key={exam.id} className="session-card">
                    <div className="session-info">
                      <div className="session-title">{exam.titulo}</div>
                      <div style={{ fontSize: 13, color: "var(--texto-tenue)", marginTop: 4 }}>
                        {exam.duracionMinutos} min · {exam._count.preguntas} preguntas
                        {exam.disponibleDesde && ` · Desde ${new Date(exam.disponibleDesde).toLocaleString("es-PE")}`}
                        {exam.disponibleHasta && ` · Hasta ${new Date(exam.disponibleHasta).toLocaleString("es-PE")}`}
                      </div>
                      <div className="session-chips" style={{ marginTop: 6 }}>
                        <span className={`chip ${estado === "Disponible" ? "chip-ok" : estado === "Vencido" ? "chip-resumen" : "chip-capturas"}`}>
                          {estado}
                        </span>
                        {exam._count.envios > 0 && (
                          <span className="chip chip-grabacion">{exam._count.envios} envío(s)</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {rol === "ESTUDIANTE" && disponible && (
                        <Link className="btn btn-primary" href={`/exams/${exam.id}`}>
                          Dar examen
                        </Link>
                      )}
                      {(rol === "ADMIN" || rol === "PROFESOR") && (
                        <Link className="btn btn-secondary" href={`/exams/${exam.id}`}>
                          Ver
                        </Link>
                      )}
                      {(rol === "ADMIN" || rol === "PROFESOR" || exam._count.envios > 0) && (
                        <Link className="btn btn-secondary" href={`/exams/${exam.id}/results`}>
                          Resultados
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Alumnos matriculados</h2>
          </div>
          {alumnos.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎓</div>
                <p className="empty-state-title">Sin alumnos matriculados</p>
                {rol === "ADMIN" && <p>Matricula alumnos desde la sección Cursos.</p>}
              </div>
            </div>
          )}
          {alumnos.length > 0 && (
            <div className="card">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                    {["Cód.", "Apellidos", "Nombres", "Email"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--texto-secundario)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a) => (
                    <tr key={a.id} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                      <td style={{ padding: "7px 12px", color: "var(--texto-tenue)" }}>{a.codigo ?? "—"}</td>
                      <td style={{ padding: "7px 12px", fontWeight: 500 }}>{a.apellido}</td>
                      <td style={{ padding: "7px 12px" }}>{a.nombre}</td>
                      <td style={{ padding: "7px 12px", color: "var(--texto-tenue)" }}>{a.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
