"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";

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

function NotaChip({ semana }: { semana: Semana }) {
  if (semana.estado === "en_curso" && semana.notaFinal === null) {
    return <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>En curso</span>;
  }
  if (semana.aprobado === null) {
    return <span className="chip" style={{ background: "#F6F7F5", color: "#8A8E89", border: "0.5px solid #E7E5DE" }}>Sin nota</span>;
  }
  if (semana.aprobado) {
    return (
      <span className="chip chip-ok" title={semana.notaFinal?.toFixed(2)}>
        {semana.notaFinal?.toFixed(1)} ✓
      </span>
    );
  }
  return (
    <span className="chip chip-resumen" title={semana.notaFinal?.toFixed(2)}>
      {semana.notaFinal?.toFixed(1)} ✗
    </span>
  );
}

export default function CalificacionesPage() {
  const { data: session } = useSession();
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

  const rol = session?.user?.rol;
  const esEstudiante = rol === "ESTUDIANTE";

  // Collect all unique courses (as columns)
  const cursosMap = new Map<string, { id: string; nombre: string }>();
  data.forEach((e) => e.semanas.forEach((s) => cursosMap.set(s.curso.id, s.curso)));
  const cursos = [...cursosMap.values()];

  return (
    <AppShell>
      <div className="page-header">
        <span className="page-eyebrow">{esEstudiante ? "Mis resultados" : "Académico"}</span>
        <h1 className="page-title">Cronograma de calificaciones</h1>
        <p className="page-subtitle">
          {esEstudiante
            ? "Tu situación académica por curso"
            : "Vista global: aprobados y desaprobados por alumno"}
        </p>
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
                {!esEstudiante && (
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                    Alumno
                  </th>
                )}
                {cursos.map((c) => (
                  <th
                    key={c.id}
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--texto-secundario)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.nombre}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, fontSize: 12, color: "var(--texto-secundario)" }}>
                  Aprobados
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entrada) => {
                const semanaMap = new Map(entrada.semanas.map((s) => [s.curso.id, s]));
                const aprobados = entrada.semanas.filter((s) => s.aprobado === true).length;
                const total = entrada.semanas.filter((s) => s.estado === "cerrado").length;

                return (
                  <tr
                    key={entrada.estudiante.id}
                    style={{ borderBottom: "0.5px solid var(--borde)" }}
                  >
                    {!esEstudiante && (
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600 }}>
                          {entrada.estudiante.nombre} {entrada.estudiante.apellido}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                          {entrada.estudiante.email}
                        </div>
                      </td>
                    )}
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
    </AppShell>
  );
}
