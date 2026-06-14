"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";

type EligibleStudent = {
  estudianteId: string;
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  count: number;
};

export default function SustitutoriosPage() {
  const [eligible, setEligible] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backend/substitutions/eligible")
      .then((r) => r.json())
      .then((data) => {
        setEligible(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <span className="page-eyebrow">Administración</span>
        <h1 className="page-title">Exámenes Sustitutorios</h1>
        <p className="page-subtitle">Alumnos con hasta 3 cursos desaprobados que califican para sustitutorio</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Alumnos elegibles ({loading ? "…" : eligible.length})
          </h2>
        </div>
        <div className="card-body">
          {loading && <p style={{ color: "var(--texto-tenue)", margin: 0 }}>Cargando…</p>}

          {!loading && eligible.length === 0 && (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-title">Sin alumnos elegibles</p>
              <p>
                Ningún alumno tiene entre 1 y 3 cursos desaprobados con nota de asistencia y académica registradas.
              </p>
            </div>
          )}

          {eligible.map((item) => (
            <div
              key={item.estudianteId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: "0.5px solid var(--borde)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {item.estudiante.nombre} {item.estudiante.apellido}
                </div>
                <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                  {item.estudiante.email}
                </div>
              </div>
              <span className="badge-desaprobado">
                {item.count} {item.count === 1 ? "curso" : "cursos"} jalado{item.count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}

          {!loading && eligible.length > 0 && (
            <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--texto-tenue)" }}>
              Para habilitar el sustitutorio manualmente, usa la API{" "}
              <code>POST /api/substitutions</code> o el futuro panel de habilitación.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
