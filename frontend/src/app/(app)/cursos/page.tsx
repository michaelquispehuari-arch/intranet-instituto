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
  destacado: boolean;
  bloqueId: string | null;
  profesor: { id: string; nombre: string; apellido: string };
};

type CoursesResponse = {
  courses?: Curso[];
};

type Bloque = {
  id: string;
  nombre: string;
  finalizadoEn: string | null;
  cursos: Array<{ id: string; nombre: string; notasPublicadasEn: string | null }>;
};

type BloquesResponse = { bloques?: Bloque[] };

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
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [profesores, setProfesores] = useState<UserItem[]>([]);
  const [newCurso, setNewCurso] = useState({ nombre: "", profesorId: "", ciclo: 1, anio: new Date().getFullYear(), descripcion: "", tipo: "REGULAR", bloqueId: "" });
  const [creating, setCreating] = useState(false);
  const [showCreateBloque, setShowCreateBloque] = useState(false);
  const [newBloqueNombre, setNewBloqueNombre] = useState("");
  const [creatingBloque, setCreatingBloque] = useState(false);
  const [finalizingBloqueId, setFinalizingBloqueId] = useState<string | null>(null);

  async function loadCourses() {
    setLoading(true);
    await fetch("/api/backend/courses")
      .then((r) => r.json())
      .then((data: CoursesResponse) => {
        setCursos(Array.isArray(data.courses) ? data.courses : []);
      })
      .finally(() => setLoading(false));
  }

  async function loadBloques() {
    const r = await fetch("/api/backend/bloques");
    if (r.ok) {
      const data = await r.json() as BloquesResponse;
      setBloques(Array.isArray(data.bloques) ? data.bloques : []);
    }
  }

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => {
    if (session?.user?.rol === "ADMIN") loadBloques();
  }, [session?.user?.rol]);

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
      body: JSON.stringify({ ...newCurso, bloqueId: newCurso.bloqueId || null }),
    });
    setCreating(false);
    if (r.ok) {
      setShowCreate(false);
      setNewCurso({ nombre: "", profesorId: "", ciclo: 1, anio: new Date().getFullYear(), descripcion: "", tipo: "REGULAR", bloqueId: "" });
      loadCourses();
    } else {
      const d = await r.json().catch(() => ({})) as { message?: string };
      setStatus(d.message ?? t("cursos.createForm.genericError"));
    }
  }

  async function createBloque(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingBloque(true);
    const r = await fetch("/api/backend/bloques", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newBloqueNombre }),
    });
    setCreatingBloque(false);
    if (r.ok) {
      setShowCreateBloque(false);
      setNewBloqueNombre("");
      loadBloques();
    } else {
      const d = await r.json().catch(() => ({})) as { message?: string };
      setStatus(d.message ?? t("cursos.createForm.genericError"));
    }
  }

  async function finalizeBloque(bloque: Bloque) {
    const ok = window.confirm(t("cursos.bloque.confirmFinalize", { nombre: bloque.nombre }));
    if (!ok) return;

    setFinalizingBloqueId(bloque.id);
    const r = await fetch(`/api/backend/bloques/${bloque.id}/finalize`, { method: "POST" });
    setFinalizingBloqueId(null);
    if (r.ok) {
      setStatus(t("cursos.bloque.finalized", { nombre: bloque.nombre }));
      loadBloques();
    } else {
      const d = await r.json().catch(() => ({})) as { message?: string; error?: string };
      setStatus(d.message ?? d.error ?? t("cursos.serverError"));
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

  async function assignBloque(curso: Curso, bloqueId: string) {
    const response = await fetch(`/api/backend/courses/${curso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bloqueId: bloqueId || null }),
    });
    if (response.ok) {
      loadCourses();
      return;
    }
    const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
    setStatus(data.message ?? data.error ?? t("cursos.serverError"));
  }

  async function toggleDestacado(curso: Curso) {
    const response = await fetch(`/api/backend/courses/${curso.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destacado: !curso.destacado }),
    });
    if (response.ok) {
      loadCourses();
      return;
    }
    const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
    setStatus(data.message ?? data.error ?? t("cursos.serverError"));
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
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowCreateBloque((v) => !v)}>
              {showCreateBloque ? t("common.cancel") : t("cursos.bloque.newBloque")}
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              {t("cursos.newCourse")}
            </button>
          </div>
        )}
      </div>

      {showCreateBloque && rol === "ADMIN" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>{t("cursos.bloque.newBloqueHeading")}</h3>
            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowCreateBloque(false)}>{t("common.cancel")}</button>
          </div>
          <form className="card-body" onSubmit={createBloque} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field" style={{ flex: 1, minWidth: 220 }}>
              <span>{t("cursos.bloque.nameLabel")}</span>
              <input required minLength={3} maxLength={120} value={newBloqueNombre} onChange={(e) => setNewBloqueNombre(e.target.value)} placeholder={t("cursos.bloque.namePlaceholder")} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={creatingBloque}>{creatingBloque ? t("cursos.createForm.submitting") : t("cursos.bloque.createSubmit")}</button>
          </form>
        </div>
      )}

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
              <label className="field">
                <span>{t("cursos.bloque.label")}</span>
                <select value={newCurso.bloqueId} onChange={(e) => setNewCurso((p) => ({ ...p, bloqueId: e.target.value }))}>
                  <option value="">{t("cursos.bloque.none")}</option>
                  {bloques.filter((b) => !b.finalizadoEn).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
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

      {rol === "ADMIN" ? (
        (() => {
          const sinBloque = cursos.filter((c) => !c.bloqueId);
          const grupos: Array<{ bloque: Bloque | null; items: Curso[] }> = [
            ...bloques.map((b) => ({ bloque: b, items: cursos.filter((c) => c.bloqueId === b.id) })),
            ...(sinBloque.length > 0 ? [{ bloque: null, items: sinBloque }] : []),
          ];
          return grupos.map((grupo) => (
            <div key={grupo.bloque?.id ?? "sin-bloque"} style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    {grupo.bloque ? grupo.bloque.nombre : t("cursos.bloque.sinBloque")}
                  </h2>
                  {grupo.bloque?.finalizadoEn && <span className="badge-pendiente">{t("cursos.bloque.finalizadoBadge")}</span>}
                  {grupo.bloque && !grupo.bloque.finalizadoEn && (
                    <span style={{ fontSize: 12, color: "var(--texto-tenue)" }}>
                      {t("cursos.bloque.progress", {
                        publicados: grupo.bloque.cursos.filter((c) => c.notasPublicadasEn !== null).length,
                        total: grupo.bloque.cursos.length,
                      })}
                    </span>
                  )}
                </div>
                {grupo.bloque && !grupo.bloque.finalizadoEn && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    disabled={finalizingBloqueId === grupo.bloque.id}
                    onClick={() => finalizeBloque(grupo.bloque!)}
                  >
                    {finalizingBloqueId === grupo.bloque.id ? t("cursos.bloque.finalizing") : t("cursos.bloque.finalizeCycle")}
                  </button>
                )}
              </div>

              <div className="card-grid">
                {grupo.items.map((curso) => (
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
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            title={curso.destacado ? t("cursos.quitarDestacado") : t("cursos.destacarEnInicio")}
                            aria-label={curso.destacado ? t("cursos.quitarDestacado") : t("cursos.destacarEnInicio")}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleDestacado(curso);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontSize: 20,
                              lineHeight: 1,
                              color: curso.destacado ? "var(--ambar-accion)" : "var(--texto-tenue)",
                            }}
                          >
                            {curso.destacado ? "★" : "☆"}
                          </button>
                          {!curso.activo && <span className="badge-pendiente">{t("cursos.inactive")}</span>}
                        </div>
                      </div>
                      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600 }}>{curso.nombre}</h2>
                      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--texto-secundario)" }}>
                        {curso.descripcion ?? "—"}
                      </p>
                      <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                        {t("cursos.teacherCycle", { nombre: curso.profesor.nombre, apellido: curso.profesor.apellido, ciclo: curso.ciclo, anio: curso.anio })}
                      </div>
                      <div style={{ marginTop: 12 }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                        <label style={{ display: "block", fontSize: 11, color: "var(--texto-tenue)", marginBottom: 4 }}>{t("cursos.bloque.label")}</label>
                        <select
                          value={curso.bloqueId ?? ""}
                          onChange={(e) => assignBloque(curso, e.target.value)}
                          style={{ fontSize: 12, border: "0.5px solid var(--borde)", borderRadius: 4, padding: "3px 6px", width: "100%" }}
                        >
                          <option value="">{t("cursos.bloque.none")}</option>
                          {bloques.map((b) => <option key={b.id} value={b.id}>{b.nombre}{b.finalizadoEn ? ` (${t("cursos.bloque.finalizadoBadge")})` : ""}</option>)}
                        </select>
                      </div>
                      {curso.activo && (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "4px 8px", color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              deleteCourse(curso);
                            }}
                          >
                            {t("cursos.deleteCourse")}
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ));
        })()
      ) : (
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
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
