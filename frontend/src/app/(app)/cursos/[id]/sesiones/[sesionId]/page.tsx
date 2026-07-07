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
  fechaLimiteEntrega: string | null;
  curso: { id: string; nombre: string; tipo: string };
  materiales: Array<{ id: string; nombre: string; tipo: string; tipoArchivo: string }>;
  asistencias: Array<{
    id: string;
    estudianteId: string;
    estado: string;
    observacion: string | null;
    estudiante: { id: string; nombre: string; apellido: string; email: string };
  }>;
  resumenes: Array<{
    id: string;
    estudianteId: string;
    estado: string;
    requerido: boolean;
    fechaLimite: string | null;
    entregadoEn: string | null;
    urlR2: string | null;
    estudiante: { id: string; nombre: string; apellido: string };
  }>;
};

type AttendanceForm = Record<string, "PRESENTE" | "AUSENTE" | "TARDANZA">;

const ESTADO_ASISTENCIA_LABEL: Record<string, string> = {
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
  TARDANZA: "Tardanza",
};

const ESTADO_RESUMEN_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENTREGADO: "Entregado",
  REVISADO: "Revisado",
};

export default function SessionDetailPage() {
  const { id: courseId, sesionId } = useParams<{ id: string; sesionId: string }>();
  const { data: session } = useSession();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"grabacion" | "capturas" | "asistencia" | "resumenes">("grabacion");
  const [ntDrafts, setNtDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sesionId) return;
    fetch(`/api/backend/sessions/${sesionId}`)
      .then((r) => r.json())
      .then((data: Sesion) => {
        setSesion(data);
        const initial: AttendanceForm = {};
        (data.asistencias ?? []).forEach((a) => {
          initial[a.estudianteId] = a.estado as "PRESENTE" | "AUSENTE" | "TARDANZA";
        });
        setAttendanceForm(initial);
        setLoading(false);
      });
  }, [sesionId]);

  const rol = session?.user?.rol;

  async function saveAttendance() {
    if (!sesion) return;
    setSaving(true);
    const asistencias = Object.entries(attendanceForm).map(([estudianteId, estado]) => ({
      estudianteId,
      estado,
    }));
    await fetch(`/api/backend/sessions/${sesionId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asistencias }),
    });
    setSaving(false);
  }

  async function reviewSummary(summaryId: string, notaTranscripcion?: number | null) {
    await fetch(`/api/backend/summaries/${summaryId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notaTranscripcion: notaTranscripcion ?? null }),
    });
    setSesion((prev) =>
      prev
        ? {
            ...prev,
            resumenes: prev.resumenes.map((r) =>
              r.id === summaryId ? { ...r, estado: "REVISADO" } : r,
            ),
          }
        : prev,
    );
  }

  if (loading) {
    return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;
  }

  if (!sesion) {
    return (
      <div className="card">
        <div className="empty-state">
          <p className="empty-state-title">Sesión no encontrada</p>
        </div>
      </div>
    );
  }

  const fecha = new Date(sesion.fecha);
  const esDiplomado = sesion.curso?.tipo === "DIPLOMADO";

  const tabs = [
    { key: "grabacion" as const, label: "Grabación" },
    { key: "capturas" as const, label: "Capturas" },
    ...(rol !== "ESTUDIANTE" ? [{ key: "asistencia" as const, label: "Asistencia" }] : []),
    { key: "resumenes" as const, label: esDiplomado ? "Entregas del día" : "Resúmenes" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/cursos/${courseId}`} style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          ← {sesion.curso?.nombre ?? "Curso"}
        </Link>
      </div>

      <div className="page-header">
        <span className="page-eyebrow">
          {fecha.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <h1 className="page-title">{sesion.titulo}</h1>
      </div>

      <div className="workspace-tabs" style={{ margin: "0 -32px 24px" }}>
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

      {tab === "grabacion" && (
        <div className="card">
          <div className="card-header">
            <h3>Grabación de la clase</h3>
          </div>
          <div className="card-body">
            {sesion.enlaceGrabacion ? (
              <div>
                <p style={{ margin: "0 0 12px", color: "var(--texto-secundario)" }}>
                  La grabación de esta clase está disponible:
                </p>
                <a
                  href={sesion.enlaceGrabacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  🎬 Ver grabación en YouTube
                </a>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-state-icon">🎬</div>
                <p className="empty-state-title">Aún no hay grabación</p>
                <p>La grabación se publicará después de la clase.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "capturas" && (
        <div className="card">
          <div className="card-header">
            <h3>Capturas de pizarra</h3>
            {(rol === "ADMIN" || rol === "PROFESOR") && (
              <button className="btn btn-primary" style={{ fontSize: 13 }}>
                + Subir captura
              </button>
            )}
          </div>
          <div className="card-body">
            {sesion.materiales.filter((m) => m.tipo === "CAPTURA_PIZARRA").length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-state-icon">🖼️</div>
                <p className="empty-state-title">Sin capturas</p>
                <p>No hay capturas de pizarra para esta sesión.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {sesion.materiales
                  .filter((m) => m.tipo === "CAPTURA_PIZARRA")
                  .map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "10px 14px",
                        border: "0.5px solid var(--borde)",
                        borderRadius: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{m.nombre}</span>
                      <span className="chip chip-capturas">{m.tipoArchivo}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "asistencia" && rol !== "ESTUDIANTE" && (
        <div className="card">
          <div className="card-header">
            <h3>Lista de asistencia</h3>
            {rol === "ADMIN" && (
              <button className="btn btn-primary" onClick={saveAttendance} disabled={saving}>
                {saving ? "Guardando…" : "Guardar asistencia"}
              </button>
            )}
          </div>
          <div className="card-body">
            {sesion.asistencias.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <p className="empty-state-title">Sin registro de asistencia aún</p>
                <p>Marca la asistencia para cada estudiante.</p>
              </div>
            ) : (
              <div>
                {sesion.asistencias.map((a) => (
                  <div key={a.estudianteId} className="attendance-row">
                    <div style={{ flex: 1 }}>
                      <div className="attendance-name">
                        {a.estudiante.nombre} {a.estudiante.apellido}
                      </div>
                      <div className="attendance-email">{a.estudiante.email}</div>
                    </div>
                    {rol === "ADMIN" ? (
                      <select
                        value={attendanceForm[a.estudianteId] ?? a.estado}
                        onChange={(e) =>
                          setAttendanceForm((prev) => ({
                            ...prev,
                            [a.estudianteId]: e.target.value as "PRESENTE" | "AUSENTE" | "TARDANZA",
                          }))
                        }
                        style={{
                          border: "0.5px solid var(--borde)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 13,
                        }}
                      >
                        <option value="PRESENTE">Presente</option>
                        <option value="AUSENTE">Ausente</option>
                        <option value="TARDANZA">Tardanza</option>
                      </select>
                    ) : (
                      <span
                        className={`chip ${
                          a.estado === "PRESENTE"
                            ? "chip-ok"
                            : a.estado === "AUSENTE"
                              ? "chip-resumen"
                              : "chip-capturas"
                        }`}
                      >
                        {ESTADO_ASISTENCIA_LABEL[a.estado] ?? a.estado}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "resumenes" && (
        <div className="card">
          <div className="card-header">
            <h3>{esDiplomado ? "Entregas del día (video/informe)" : "Resúmenes de alumnos"}</h3>
            {esDiplomado && sesion.fechaLimiteEntrega && (
              <span style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                Cierra el {new Date(sesion.fechaLimiteEntrega).toLocaleDateString("es-PE")}
              </span>
            )}
          </div>
          <div className="card-body">
            {sesion.resumenes.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-state-icon">📄</div>
                <p className="empty-state-title">{esDiplomado ? "Sin entregas aún" : "Sin resúmenes asignados"}</p>
                {rol === "ADMIN" && <p>{esDiplomado ? "Aparecerán aquí cuando los alumnos suban su video o informe." : 'Usa "Requerir resumen" desde la gestión de sesiones.'}</p>}
                {rol === "ESTUDIANTE" && <p>No tienes resúmenes pendientes para esta sesión.</p>}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {sesion.resumenes.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "12px 16px",
                      border: "0.5px solid var(--borde)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {rol !== "ESTUDIANTE" && (
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {r.estudiante.nombre} {r.estudiante.apellido}
                        </div>
                      )}
                      {r.fechaLimite && (
                        <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                          Plazo: {new Date(r.fechaLimite).toLocaleDateString("es-PE")}
                        </div>
                      )}
                    </div>

                    <span
                      className={`chip ${
                        r.estado === "REVISADO"
                          ? "chip-ok"
                          : r.estado === "ENTREGADO"
                            ? "chip-capturas"
                            : "chip-resumen"
                      }`}
                    >
                      {ESTADO_RESUMEN_LABEL[r.estado] ?? r.estado}
                    </span>

                    {(rol === "ADMIN" || rol === "PROFESOR") && r.urlR2 && (
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={async () => {
                        const res = await fetch(`/api/backend/summaries/${r.id}/files`);
                        if (res.ok) {
                          const d = await res.json() as { urls: Array<{ filename: string; url: string }> };
                          d.urls.forEach((u) => window.open(u.url, "_blank", "noopener"));
                        }
                      }}>
                        Ver archivos ({(() => { try { const a = JSON.parse(r.urlR2); return Array.isArray(a) ? a.length : 1; } catch { return 1; } })()})
                      </button>
                    )}
                    {(rol === "ADMIN" || rol === "PROFESOR") && r.estado === "ENTREGADO" && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="number"
                          min={0}
                          max={esDiplomado ? 20 : 18}
                          step={0.5}
                          placeholder={esDiplomado ? "Nota (0-20)" : "NT (0-18)"}
                          value={ntDrafts[r.id] ?? ""}
                          onChange={(e) => setNtDrafts((p) => ({ ...p, [r.id]: e.target.value }))}
                          style={{ width: 80, border: "0.5px solid var(--borde)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}
                        />
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => {
                            const nt = ntDrafts[r.id] !== undefined && ntDrafts[r.id] !== "" ? Number(ntDrafts[r.id]) : null;
                            reviewSummary(r.id, nt);
                          }}
                        >
                          Marcar revisado
                        </button>
                      </div>
                    )}

                    {rol === "ESTUDIANTE" && r.requerido && r.estado === "PENDIENTE" && (
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}>
                        Subir resumen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
