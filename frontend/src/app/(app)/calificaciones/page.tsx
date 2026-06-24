"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// ── Tipos para ADMIN/PROFESOR (timeline) ─────────────────────────────────
type Semana = {
  curso: { id: string; nombre: string; ciclo: number; anio: number };
  notaFinal: number | null;
  aprobado: boolean | null;
  estado: "en_curso" | "cerrado";
};
type Entrada = {
  estudiante: { id: string; nombre: string; apellido: string; email: string };
  semanas: Semana[];
};

// ── Tipos para ESTUDIANTE (grades/mine) ──────────────────────────────────
type MiNota = {
  cursoId: string;
  nombre: string;
  ciclo: number;
  anio: number;
  publicadas: boolean;
  notaFinalPublicada: number | null;
};

function NotaChip({ semana }: { semana: Semana }) {
  if (semana.estado === "en_curso" && semana.notaFinal === null) {
    return <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>En curso</span>;
  }
  if (semana.aprobado === null) {
    return <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>Sin nota</span>;
  }
  if (semana.aprobado) {
    return <span className="chip chip-ok" title={semana.notaFinal?.toFixed(2)}>{semana.notaFinal?.toFixed(1)} ✓</span>;
  }
  return <span className="chip chip-resumen" title={semana.notaFinal?.toFixed(2)}>{semana.notaFinal?.toFixed(1)} ✗</span>;
}

// ── Vista ESTUDIANTE ──────────────────────────────────────────────────────
function EstudianteView() {
  const [notas, setNotas] = useState<MiNota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backend/grades/mine")
      .then((r) => r.json())
      .then((d) => {
        setNotas(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Mis resultados</span>
        <h1 className="page-title">Mis calificaciones</h1>
        <p className="page-subtitle">Notas publicadas por el administrador</p>
      </div>

      {notas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-title">Sin inscripciones</p>
            <p>No estás inscrito en ningún curso activo.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--borde)" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>Curso</th>
                  <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600 }}>Nota Final</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => {
                  const aprobado = n.notaFinalPublicada !== null ? n.notaFinalPublicada >= 11 : null;
                  return (
                    <tr key={n.cursoId} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 600 }}>{n.nombre}</div>
                        <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>Ciclo {n.ciclo} — {n.anio}</div>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                        {!n.publicadas ? (
                          <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>
                            Aún no publicadas
                          </span>
                        ) : n.notaFinalPublicada === null ? (
                          <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>—</span>
                        ) : aprobado ? (
                          <span className="chip chip-ok">{n.notaFinalPublicada} ✓</span>
                        ) : (
                          <span className="chip chip-resumen">{n.notaFinalPublicada} ✗</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vista ADMIN / PROFESOR (timeline existente) ───────────────────────────
function AdminView() {
  const [data, setData] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backend/grades/timeline")
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  const cursosMap = new Map<string, { id: string; nombre: string }>();
  data.forEach((e) => e.semanas.forEach((s) => cursosMap.set(s.curso.id, s.curso)));
  const cursos = [...cursosMap.values()];

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Académico</span>
        <h1 className="page-title">Cronograma de calificaciones</h1>
        <p className="page-subtitle">Vista global: aprobados y desaprobados por alumno</p>
      </div>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}

      {!loading && data.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-title">Sin datos de calificaciones</p>
            <p>No hay cursos o inscripciones registradas aún.</p>
          </div>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid var(--borde)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>Alumno</th>
                {cursos.map((c) => (
                  <th key={c.id} style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: "var(--texto-secundario)", whiteSpace: "nowrap" }}>
                    {c.nombre}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: "var(--texto-secundario)" }}>Aprobados</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entrada) => {
                const semanaMap = new Map(entrada.semanas.map((s) => [s.curso.id, s]));
                const aprobados = entrada.semanas.filter((s) => s.aprobado === true).length;
                const total = entrada.semanas.filter((s) => s.estado === "cerrado").length;
                return (
                  <tr key={entrada.estudiante.id} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                    <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600 }}>{entrada.estudiante.nombre} {entrada.estudiante.apellido}</div>
                      <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>{entrada.estudiante.email}</div>
                    </td>
                    {cursos.map((c) => {
                      const s = semanaMap.get(c.id);
                      return (
                        <td key={c.id} style={{ padding: "8px 12px", textAlign: "center" }}>
                          {s ? <NotaChip semana={s} /> : <span style={{ color: "var(--texto-tenue)", fontSize: 12 }}>—</span>}
                        </td>
                      );
                    })}
                    <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                      {total > 0 ? (
                        <span style={{ color: aprobados === total ? "var(--aprobado-texto)" : aprobados > 0 ? "var(--ambar-accion)" : "var(--desaprobado-texto)" }}>
                          {aprobados}/{total}
                        </span>
                      ) : (
                        <span style={{ color: "var(--texto-tenue)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span className="chip chip-ok">Aprobado</span>
          <span className="chip chip-resumen">Desaprobado</span>
          <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>En curso / sin nota</span>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function CalificacionesPage() {
  const { data: session } = useSession();
  const rol = session?.user?.rol;

  if (!rol) return <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>;
  if (rol === "ESTUDIANTE") return <EstudianteView />;
  return <AdminView />;
}
