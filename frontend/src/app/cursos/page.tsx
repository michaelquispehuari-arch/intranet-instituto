"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";

type Curso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  ciclo: number;
  anio: number;
  tipo: string;
  activo: boolean;
  profesor: { id: string; nombre: string; apellido: string };
};

const TIPO_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  ENTRENAMIENTO: "Entrenamiento",
  ESPECIAL: "Especial",
};

export default function CursosPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backend/courses")
      .then((r) => r.json())
      .then((data) => {
        setCursos(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const rol = session?.user?.rol;

  return (
    <AppShell>
      <div className="page-header">
        <span className="page-eyebrow">Academia</span>
        <h1 className="page-title">Cursos</h1>
        <p className="page-subtitle">Semana actual de clases</p>
      </div>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}

      {!loading && cursos.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">Sin cursos asignados</p>
            <p>No hay cursos disponibles para tu rol.</p>
          </div>
        </div>
      )}

      <div className="stat-grid">
        {cursos.map((curso) => (
          <Link
            key={curso.id}
            href={`/cursos/${curso.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="card" style={{ padding: "20px", cursor: "pointer", transition: "box-shadow 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ambar-accion)",
                }}>
                  {TIPO_LABEL[curso.tipo] ?? curso.tipo}
                </span>
                {!curso.activo && (
                  <span className="badge-pendiente">Inactivo</span>
                )}
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{curso.nombre}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--texto-secundario)" }}>
                {curso.descripcion ?? "—"}
              </p>
              <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                Prof. {curso.profesor.nombre} {curso.profesor.apellido} · Ciclo {curso.ciclo} / {curso.anio}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {rol === "ADMIN" && (
        <div style={{ marginTop: 24 }}>
          <Link href="/courses" className="btn btn-secondary">
            Gestión completa de cursos
          </Link>
        </div>
      )}
    </AppShell>
  );
}
