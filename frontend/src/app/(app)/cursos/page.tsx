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

type UserItem = { id: string; nombre: string; apellido: string; rol: string };
type UsersResponse = { users?: UserItem[] };

const TIPO_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  ENTRENAMIENTO: "Entrenamiento",
  ESPECIAL: "Especial",
  DIPLOMADO: "Diplomado",
};

export default function CursosPage() {
  const { data: session } = useSession();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [profesores, setProfesores] = useState<UserItem[]>([]);
  const [newCurso, setNewCurso] = useState({ nombre: "", profesorId: "", ciclo: 1, anio: new Date().getFullYear(), descripcion: "", tipo: "REGULAR" });
  const [creating, setCreating] = useState(false);

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

  async function openCreate() {
    setShowCreate(true);
    if (profesores.length === 0) {
      const r = await fetch("/api/backend/users");
      if (r.ok) {
        const d = await r.json() as UsersResponse;
        setProfesores((d.users ?? []).filter((u) => u.rol === "PROFESOR"));
      }
    }
  }

  async function createCurso(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const r = await fetch("/api/backend/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCurso),
    });
    setCreating(false);
    if (r.ok) {
      setShowCreate(false);
      setNewCurso({ nombre: "", profesorId: "", ciclo: 1, anio: new Date().getFullYear(), descripcion: "", tipo: "REGULAR" });
      loadCourses();
    } else {
      const d = await r.json().catch(() => ({})) as { message?: string };
      setStatus(d.message ?? "Error al crear curso");
    }
  }

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
          <h1 className="page-title">Cursos</h1>
        </div>
        {rol === "ADMIN" && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo curso
          </button>
        )}
      </div>

      {showCreate && rol === "ADMIN" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Nuevo curso</h3>
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowCreate(false)}>Cancelar</button>
          </div>
          <form className="card-body" onSubmit={createCurso} style={{ display: "grid", gap: 14 }}>
            <div className="form-grid">
              <label className="field">
                <span>Nombre del curso</span>
                <input required minLength={3} maxLength={120} value={newCurso.nombre} onChange={(e) => setNewCurso((p) => ({ ...p, nombre: e.target.value }))} />
              </label>
              <label className="field">
                <span>Profesor</span>
                <select required value={newCurso.profesorId} onChange={(e) => setNewCurso((p) => ({ ...p, profesorId: e.target.value }))}>
                  <option value="">Seleccionar…</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Tipo de curso</span>
                <select value={newCurso.tipo} onChange={(e) => setNewCurso((p) => ({ ...p, tipo: e.target.value }))}>
                  <option value="REGULAR">Regular (con examen)</option>
                  <option value="DIPLOMADO">Diplomado (sin examen, con entregas diarias)</option>
                </select>
              </label>
              <label className="field">
                <span>Ciclo</span>
                <input type="number" min={1} max={2} required value={newCurso.ciclo} onChange={(e) => setNewCurso((p) => ({ ...p, ciclo: Number(e.target.value) }))} />
              </label>
              <label className="field">
                <span>Año</span>
                <input type="number" min={2026} max={2100} required value={newCurso.anio} onChange={(e) => setNewCurso((p) => ({ ...p, anio: Number(e.target.value) }))} />
              </label>
              <label className="field full-row">
                <span>Descripción (opcional)</span>
                <textarea rows={2} maxLength={500} value={newCurso.descripcion} onChange={(e) => setNewCurso((p) => ({ ...p, descripcion: e.target.value }))} />
              </label>
            </div>
            <div className="card-actions">
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Creando…" : "Crear curso"}</button>
            </div>
          </form>
        </div>
      )}

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
