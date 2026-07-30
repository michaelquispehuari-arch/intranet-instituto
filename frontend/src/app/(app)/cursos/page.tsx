"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

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

export default function CursosPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const TIPO_LABEL: Record<string, string> = {
    REGULAR: t("cursos.tipo.REGULAR"),
    ENTRENAMIENTO: t("cursos.tipo.ENTRENAMIENTO"),
    ESPECIAL: t("cursos.tipo.ESPECIAL"),
    DIPLOMADO: t("cursos.tipo.DIPLOMADO"),
  };
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
      setStatus(d.message ?? t("cursos.createForm.genericError"));
    }
  }

  async function deleteCourse(curso: Curso) {
    const ok = window.confirm(t("cursos.confirmDelete", { nombre: curso.nombre }));
    if (!ok) return;

    const response = await fetch(`/api/backend/courses/${curso.id}`, { method: "DELETE" });
    if (response.ok) {
      setStatus(t("cursos.deleted"));
      loadCourses();
      return;
    }

    const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
    setStatus(t("cursos.deleteError", { motivo: data.message ?? data.error ?? t("cursos.serverError") }));
  }

  const rol = session?.user?.rol;

  const emptyLabel =
    rol === "ADMIN"
      ? t("cursos.emptyAdmin")
      : rol === "PROFESOR"
        ? t("cursos.emptyProfesor")
        : t("cursos.emptyEstudiante");

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">{t("cursos.title")}</h1>
        </div>
        {rol === "ADMIN" && (
          <button className="btn btn-primary" onClick={openCreate}>
            {t("cursos.newCourse")}
          </button>
        )}
      </div>

      {showCreate && rol === "ADMIN" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>{t("cursos.createForm.heading")}</h3>
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowCreate(false)}>{t("common.cancel")}</button>
          </div>
          <form className="card-body" onSubmit={createCurso} style={{ display: "grid", gap: 14 }}>
            <div className="form-grid">
              <label className="field">
                <span>{t("cursos.createForm.nameLabel")}</span>
                <input required minLength={3} maxLength={120} value={newCurso.nombre} onChange={(e) => setNewCurso((p) => ({ ...p, nombre: e.target.value }))} />
              </label>
              <label className="field">
                <span>{t("cursos.createForm.profesorLabel")}</span>
                <select required value={newCurso.profesorId} onChange={(e) => setNewCurso((p) => ({ ...p, profesorId: e.target.value }))}>
                  <option value="">{t("cursos.createForm.selectPlaceholder")}</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t("cursos.createForm.typeLabel")}</span>
                <select value={newCurso.tipo} onChange={(e) => setNewCurso((p) => ({ ...p, tipo: e.target.value }))}>
                  <option value="REGULAR">{t("cursos.createForm.typeRegular")}</option>
                  <option value="DIPLOMADO">{t("cursos.createForm.typeDiplomado")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("cursos.createForm.cycleLabel")}</span>
                <input type="number" min={1} max={2} required value={newCurso.ciclo} onChange={(e) => setNewCurso((p) => ({ ...p, ciclo: Number(e.target.value) }))} />
              </label>
              <label className="field">
                <span>{t("cursos.createForm.yearLabel")}</span>
                <input type="number" min={2026} max={2100} required value={newCurso.anio} onChange={(e) => setNewCurso((p) => ({ ...p, anio: Number(e.target.value) }))} />
              </label>
              <label className="field full-row">
                <span>{t("cursos.createForm.descriptionLabel")}</span>
                <textarea rows={2} maxLength={500} value={newCurso.descripcion} onChange={(e) => setNewCurso((p) => ({ ...p, descripcion: e.target.value }))} />
              </label>
            </div>
            <div className="card-actions">
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? t("cursos.createForm.submitting") : t("cursos.createForm.submit")}</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p style={{ color: "var(--texto-tenue)" }}>{t("common.loading")}</p>}
      {status && <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>}

      {!loading && cursos.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">{t("cursos.emptyTitle")}</p>
            <p>{emptyLabel}</p>
          </div>
        </div>
      )}

      <div className="card-grid">
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
                {!curso.activo && <span className="badge-pendiente">{t("cursos.inactive")}</span>}
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{curso.nombre}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--texto-secundario)" }}>
                {curso.descripcion ?? "—"}
              </p>
              <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                {t("cursos.teacherCycle", { nombre: curso.profesor.nombre, apellido: curso.profesor.apellido, ciclo: curso.ciclo, anio: curso.anio })}
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
                  {t("cursos.deleteCourse")}
                </button>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
