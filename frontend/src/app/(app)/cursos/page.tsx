"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

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

type CoursesResponse = {
  courses?: Curso[];
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
  const [status, setStatus] = useState("");

  async function loadCourses() {
    setLoading(true);
    await fetch("/api/backend/courses")
      .then((r) => r.json())
      .then((data: CoursesResponse) => {
        setCursos(Array.isArray(data.courses) ? data.courses : []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCourses(); }, []);

  async function deleteCourse(curso: Curso) {
    const ok = window.confirm(`Eliminar curso "${curso.nombre}"? Quedara inactivo y no se borrara el historial.`);
    if (!ok) return;

    const response = await fetch(`/api/backend/courses/${curso.id}`, { method: "DELETE" });
    if (response.ok) {
      setStatus("Curso eliminado.");
      loadCourses();
      return;
    }

    const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
    setStatus(`Error al eliminar: ${data.message ?? data.error ?? "Error del servidor"}`);
  }

  const rol = session?.user?.rol;

  const emptyLabel =
    rol === "ADMIN"
      ? "Aún no hay cursos. Crear el primero desde la gestión de cursos."
      : rol === "PROFESOR"
        ? "No tienes cursos asignados esta semana."
        : "No estás inscrito en ningún curso activo.";

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Academia</span>
          <h1 className="page-title">Cursos</h1>
        </div>
        {rol === "ADMIN" && (
          <Link href="/courses" className="btn btn-primary">
            + Nuevo curso
          </Link>
        )}
      </div>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}
      {status && <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>}

      {!loading && cursos.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">Sin cursos</p>
            <p>{emptyLabel}</p>
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
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ambar-accion)" }}>
                  {TIPO_LABEL[curso.tipo] ?? curso.tipo}
                </span>
                {!curso.activo && <span className="badge-pendiente">Inactivo</span>}
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{curso.nombre}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--texto-secundario)" }}>
                {curso.descripcion ?? "—"}
              </p>
              <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                Prof. {curso.profesor.nombre} {curso.profesor.apellido} · Ciclo {curso.ciclo} / {curso.anio}
              </div>
              {rol === "ADMIN" && curso.activo && (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: 12, fontSize: 12, padding: "4px 8px", color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    deleteCourse(curso);
                  }}
                >
                  Eliminar curso
                </button>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
