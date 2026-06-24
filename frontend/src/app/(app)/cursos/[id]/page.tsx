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
  ingresoHastaMin: number;
  publicadoEn: string | null;
  disponibleDesde: string | null;
  _count: { preguntas: number; envios: number };
};

type AlumnoItem = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  codigo: string | null;
};

type MaterialItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipoArchivo: string;
  creadoEn: string;
};

type MySummary = {
  sesionId: string;
  estado: string;
  urlR2: string | null;
  entregadoEn: string | null;
  notaTranscripcion: number | null;
};

type Tab = "sesiones" | "material" | "examenes" | "notas" | "alumnos" | "transcripcion";

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
  const [newSession, setNewSession] = useState({ titulo: "", enlaceGrabacion: "" });
  const [creatingSession, setCreatingSession] = useState(false);
  const [exams, setExams] = useState<ExamItem[] | null>(null);
  const [examsLoading, setExamsLoading] = useState(false);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [materiales, setMateriales] = useState<MaterialItem[] | null>(null);
  const [materialesLoading, setMaterialesLoading] = useState(false);
  const [profNotas, setProfNotas] = useState<{ publicadas: boolean; notasPublicadasEn: string | null; filas: Array<{ estudianteId: string; codigo: string; nombre: string; apellido: string; notaFinalPublicada: number | null }> } | null>(null);
  const [profNotasLoaded, setProfNotasLoaded] = useState(false);
  const [mySummaries, setMySummaries] = useState<Record<string, MySummary>>({});
  const [summariesLoaded, setSummariesLoaded] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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

  async function loadProfNotas() {
    if (profNotasLoaded) return;
    const r = await fetch(`/api/backend/courses/${id}/grades`);
    if (r.ok) setProfNotas(await r.json());
    setProfNotasLoaded(true);
  }

  async function loadMateriales() {
    if (materiales !== null || materialesLoading) return;
    setMaterialesLoading(true);
    const r = await fetch(`/api/backend/content?cursoId=${id}`);
    if (r.ok) {
      const d = await r.json() as { materials?: MaterialItem[] };
      setMateriales(Array.isArray(d.materials) ? d.materials : []);
    } else {
      setMateriales([]);
    }
    setMaterialesLoading(false);
  }

  async function loadMySummaries() {
    if (summariesLoaded) return;
    const r = await fetch(`/api/backend/courses/${id}/summaries/mine`);
    if (r.ok) {
      const data = await r.json() as MySummary[];
      setMySummaries(Object.fromEntries((Array.isArray(data) ? data : []).map((s) => [s.sesionId, s])));
    }
    setSummariesLoaded(true);
  }

  async function uploadTranscripcion(sesionId: string) {
    const fileList = uploadFiles[sesionId] as unknown as FileList | null;
    if (!fileList || fileList.length === 0) return;
    setUploadingId(sesionId);
    const fd = new FormData();
    for (let i = 0; i < fileList.length; i++) fd.append("files", fileList[i]);
    const r = await fetch(`/api/backend/sessions/${sesionId}/summaries/self-upload`, { method: "POST", body: fd });
    setUploadingId(null);
    if (r.ok) {
      const data = await r.json() as MySummary;
      setMySummaries((prev) => ({ ...prev, [sesionId]: data }));
      setUploadFiles((prev) => ({ ...prev, [sesionId]: null }));
    } else {
      const d = await r.json().catch(() => ({})) as { message?: string };
      alert(d.message ?? "Error al subir los archivos");
    }
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
    const response = await fetch(`/api/backend/courses/${id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: newSession.titulo,
        enlaceGrabacion: newSession.enlaceGrabacion,
      }),
    });
    setCreatingSession(false);

    if (!response.ok) {
      const d = await response.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> };
      const fieldMsg = d.errors ? Object.entries(d.errors).map(([f, e]) => `${f}: ${e.join(", ")}`).join(" | ") : "";
      setSessionError(fieldMsg || d.message || "Error al crear la clase.");
      return;
    }

    const created = (await response.json()) as Sesion;
    setSesiones((current) => [...current, created].sort((a, b) => a.orden - b.orden));
    setRecordingDrafts((current) => ({ ...current, [created.id]: created.enlaceGrabacion ?? "" }));
    setNewSession({ titulo: "", enlaceGrabacion: "" });
  }

  const allTabs: { key: Tab; label: string; roles: Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE"> }[] = [
    { key: "sesiones", label: "Sesiones", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "material", label: "Material", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "examenes", label: "Exámenes", roles: ["ADMIN", "PROFESOR", "ESTUDIANTE"] },
    { key: "notas", label: "Notas", roles: ["ADMIN", "PROFESOR"] },
    { key: "alumnos", label: "Alumnos", roles: ["ADMIN", "PROFESOR"] },
    { key: "transcripcion", label: "Transcripción", roles: ["ESTUDIANTE"] },
  ];
  const tabs = allTabs.filter((t) => !rol || t.roles.includes(rol as "ADMIN" | "PROFESOR" | "ESTUDIANTE"));

  function handleTabChange(key: Tab) {
    setTab(key);
    if (key === "examenes") loadExams();
    if (key === "material") loadMateriales();
    if (key === "transcripcion") loadMySummaries();
    if (key === "notas" && rol === "PROFESOR") loadProfNotas();
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
                    <div className="session-title">
                      {canManageRecordings ? (
                        <Link href={`/cursos/${id}/sesiones/${sesion.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {sesion.titulo}
                        </Link>
                      ) : sesion.titulo}
                    </div>
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
                </article>
              );
            })}
          </div>
          {canCreateSessions && (
            <form className="card form wide-form" onSubmit={createSession} style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Publicar grabación de clase</h3>
              <div className="form-grid">
                <label className="field">
                  <span>Título</span>
                  <input
                    placeholder={`Clase ${sesiones.length + 1} — ${curso.nombre}`}
                    value={newSession.titulo}
                    onChange={(event) => setNewSession((current) => ({ ...current, titulo: event.target.value }))}
                    required
                  />
                </label>
                <label className="field">
                  <span>Link YouTube</span>
                  <input
                    placeholder="https://youtu.be/... o https://www.youtube.com/watch?v=..."
                    value={newSession.enlaceGrabacion}
                    onChange={(event) =>
                      setNewSession((current) => ({ ...current, enlaceGrabacion: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>
              {sessionError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{sessionError}</p>
              )}
              <div className="card-actions">
                <button className="btn btn-primary" type="submit" disabled={creatingSession}>
                  {creatingSession ? "Publicando..." : "Publicar clase"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "material" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Material del curso</h2>
            {(rol === "ADMIN" || rol === "PROFESOR") && (
              <Link href={`/material/subir?cursoId=${id}`} className="btn btn-primary">
                + Subir material
              </Link>
            )}
          </div>
          {materialesLoading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}
          {!materialesLoading && materiales !== null && materiales.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <p className="empty-state-title">Sin material aún</p>
                <p>{(rol === "ADMIN" || rol === "PROFESOR") ? "Sube el primer archivo con el botón de arriba." : "El profesor aún no ha subido material."}</p>
              </div>
            </div>
          )}
          {!materialesLoading && materiales && materiales.length > 0 && (
            <div className="card">
              {materiales.map((m, i) => (
                <div key={m.id} style={{ padding: "12px 16px", borderBottom: i < materiales.length - 1 ? "0.5px solid var(--borde)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{m.tipoArchivo === "pdf" ? "📄" : m.tipoArchivo === "mp4" || m.tipoArchivo === "mov" ? "🎥" : "📎"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{m.nombre}</div>
                    {m.descripcion && <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>{m.descripcion}</div>}
                    <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>{new Date(m.creadoEn).toLocaleDateString("es-PE")}</div>
                  </div>
                  <a href={`/api/backend/content/${m.id}/download`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flexShrink: 0, fontSize: 13 }}>
                    Ver / Descargar
                  </a>
                </div>
              ))}
            </div>
          )}
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
                const cierre = desde ? new Date(desde.getTime() + exam.duracionMinutos * 60_000) : null;
                const ingresoHasta = desde ? new Date(desde.getTime() + exam.ingresoHastaMin * 60_000) : null;
                const disponible = exam.publicadoEn && desde && desde <= now && cierre && cierre > now;
                const enVentanaIngreso = disponible && ingresoHasta && ingresoHasta > now;
                const vencido = cierre && cierre < now;
                const estado = !exam.publicadoEn ? "Borrador" : vencido ? "Vencido" : disponible ? "En curso" : "Pendiente";
                return (
                  <article key={exam.id} className="session-card">
                    <div className="session-info">
                      <div className="session-title">{exam.titulo}</div>
                      <div style={{ fontSize: 13, color: "var(--texto-tenue)", marginTop: 4 }}>
                        {exam.duracionMinutos} min · {exam._count.preguntas} preguntas
                        {desde && ` · Inicio ${desde.toLocaleString("es-PE", { timeZone: "America/Lima" })}`}
                        {cierre && ` · Cierre ${cierre.toLocaleString("es-PE", { timeZone: "America/Lima" })}`}
                      </div>
                      <div className="session-chips" style={{ marginTop: 6 }}>
                        <span className={`chip ${estado === "En curso" ? "chip-ok" : estado === "Vencido" ? "chip-resumen" : "chip-capturas"}`}>
                          {estado}
                        </span>
                        {exam._count.envios > 0 && (
                          <span className="chip chip-grabacion">{exam._count.envios} envío(s)</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {rol === "ESTUDIANTE" && enVentanaIngreso && (
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

      {tab === "notas" && rol === "ADMIN" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Calificaciones</h2>
            <Link href={`/cursos/${id}/notas`} className="btn btn-primary">Abrir grilla de notas</Link>
          </div>
          <div className="card">
            <div className="card-body" style={{ color: "var(--texto-tenue)", fontSize: 13 }}>
              Edita celdas de cámara, NT y publica notas desde la grilla completa.
            </div>
          </div>
        </div>
      )}

      {tab === "notas" && rol === "PROFESOR" && (
        <div>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Calificaciones publicadas</h2>
          {!profNotasLoaded && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}
          {profNotasLoaded && (!profNotas || !profNotas.publicadas) && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-title">Notas aún no publicadas</p>
                <p>El administrador aún no ha publicado las notas de este curso.</p>
              </div>
            </div>
          )}
          {profNotasLoaded && profNotas?.publicadas && (
            <div className="card">
              {profNotas.notasPublicadasEn && (
                <p style={{ fontSize: 12, color: "var(--texto-tenue)", margin: "0 0 0", padding: "12px 16px 0" }}>
                  Publicadas el {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(profNotas.notasPublicadasEn))}
                </p>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--verde-sidebar)", color: "#fff" }}>
                    <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600 }}>Apellidos y Nombres</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Nota Final</th>
                  </tr>
                </thead>
                <tbody>
                  {profNotas.filas.map((f) => {
                    const ap = f.notaFinalPublicada !== null ? f.notaFinalPublicada >= 11 : null;
                    return (
                      <tr key={f.estudianteId} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                        <td style={{ padding: "7px 16px", fontWeight: 500 }}>{f.apellido}, {f.nombre}</td>
                        <td style={{ padding: "7px 12px", textAlign: "center" }}>
                          <span style={{ padding: "2px 10px", borderRadius: 6, fontWeight: 700, color: ap === true ? "var(--aprobado-texto)" : ap === false ? "var(--desaprobado-texto)" : "var(--texto-tenue)", background: ap === true ? "var(--aprobado-fondo)" : ap === false ? "var(--desaprobado-fondo)" : "#F6F7F5" }}>
                            {f.notaFinalPublicada ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      {tab === "transcripcion" && rol === "ESTUDIANTE" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Subir mi transcripción</h2>
            <p style={{ marginTop: 6, fontSize: 13, color: "var(--texto-tenue)" }}>
              Elige el día que faltaste, selecciona uno o varios archivos (PDF, Word, imágenes) y presiona Subir. El admin revisará y colocará tu nota.
            </p>
          </div>
          {!summariesLoaded && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}
          {summariesLoaded && sesiones.length === 0 && (
            <div className="card"><div className="empty-state"><p>No hay sesiones publicadas aún.</p></div></div>
          )}
          {summariesLoaded && sesiones.length > 0 && (
            <div className="session-list">
              {sesiones.slice(0, 3).map((sesion, idx) => {
                const dayLabel = `Día ${idx + 1}`;
                const summary = mySummaries[sesion.id];
                const fileCount = summary?.urlR2 ? (() => { try { const a = JSON.parse(summary.urlR2); return Array.isArray(a) ? a.length : 1; } catch { return 1; } })() : 0;
                const yaSubio = fileCount > 0;
                const selectedFiles = uploadFiles[sesion.id] as unknown as FileList | null;
                const count = selectedFiles ? selectedFiles.length : 0;
                const subiendo = uploadingId === sesion.id;
                return (
                  <article key={sesion.id} className="session-card" style={{ flexWrap: "wrap", gap: 12 }}>
                    <div className="session-info" style={{ minWidth: 0 }}>
                      <div className="session-title">{dayLabel} — {sesion.titulo}</div>
                      {yaSubio && (
                        <div style={{ fontSize: 12, color: "var(--aprobado-texto)", marginTop: 4 }}>
                          {fileCount} archivo{fileCount !== 1 ? "s" : ""} subido{fileCount !== 1 ? "s" : ""}{summary.entregadoEn ? ` · ${new Date(summary.entregadoEn).toLocaleDateString("es-PE")}` : ""}
                          {summary.notaTranscripcion !== null && <span style={{ marginLeft: 8 }}>· NT: <strong>{summary.notaTranscripcion}</strong></span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                      <label style={{ fontSize: 13 }}>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) => {
                            setUploadFiles((prev) => ({ ...prev, [sesion.id]: e.target.files as unknown as File | null }));
                          }}
                        />
                        <span className="btn btn-secondary" style={{ cursor: "pointer", fontSize: 13 }}>
                          {count > 0 ? `${count} archivo${count !== 1 ? "s" : ""} seleccionado${count !== 1 ? "s" : ""}` : yaSubio ? "Reemplazar" : "Elegir archivos"}
                        </span>
                      </label>
                      {count > 0 && (
                        <button className="btn btn-primary" disabled={subiendo} onClick={() => uploadTranscripcion(sesion.id)} style={{ fontSize: 13 }}>
                          {subiendo ? "Subiendo…" : "Subir"}
                        </button>
                      )}
                      {yaSubio && count === 0 && <span className="chip chip-ok">Entregada ✓</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
