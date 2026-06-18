"use client";

import { useEffect, useRef, useState } from "react";

type ModoEstudio = "SINCRONICO" | "ASINCRONICO" | "MIXTO";

type Estudiante = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  codigo: string | null;
  modo: ModoEstudio;
  iglesia: string | null;
  pais: string | null;
  semestreIngreso: number | null;
  anioIngreso: number | null;
  dni: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  coordinador: string | null;
};

const MODO_LABEL: Record<ModoEstudio, string> = {
  SINCRONICO: "Sincrónico",
  ASINCRONICO: "Asincrónico",
  MIXTO: "Mixto",
};

function fmtFecha(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PE");
}

export default function EstudiantesPage() {
  const [students, setStudents] = useState<Estudiante[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Estudiante>>({});
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Estudiante>>({
    modo: "SINCRONICO",
  });
  const [importStatus, setImportStatus] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  async function load(q = query) {
    setLoading(true);
    const r = await fetch(`/api/backend/students${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (r.ok) {
      const d = await r.json();
      setStudents(d.students ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(query);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError(null);
    const r = await fetch("/api/backend/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    });
    setSaving(false);
    if (r.ok) {
      setShowCreate(false);
      setNewStudent({ modo: "SINCRONICO" });
      load();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setCreateError(d.error ?? "Error al crear estudiante");
    }
  }

  function startEdit(s: Estudiante) {
    setEditId(s.id);
    setEditData({
      nombre: s.nombre,
      apellido: s.apellido,
      email: s.email,
      codigo: s.codigo ?? "",
      modo: s.modo,
      iglesia: s.iglesia ?? "",
      pais: s.pais ?? "",
      semestreIngreso: s.semestreIngreso ?? undefined,
      anioIngreso: s.anioIngreso ?? undefined,
      dni: s.dni ?? "",
      telefono: s.telefono ?? "",
      coordinador: s.coordinador ?? "",
      activo: s.activo,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    await fetch(`/api/backend/students/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setSaving(false);
    setEditId(null);
    load();
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Procesando…");

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
      return {
        email: obj.correo ?? obj.email ?? "",
        nombre: obj.nombres ?? obj.nombre ?? "",
        apellido: obj.apellidos ?? obj.apellido ?? "",
        codigo: obj["código"] ?? obj.codigo ?? undefined,
        modo: ((obj.modo ?? "").toUpperCase() || "SINCRONICO") as ModoEstudio,
        iglesia: obj.iglesia ?? undefined,
        pais: obj["país"] ?? obj.pais ?? undefined,
        semestreIngreso: obj["sem."] ? parseInt(obj["sem."]) : undefined,
        anioIngreso: obj["año"] ?? obj.anio ? parseInt(obj["año"] ?? obj.anio) : undefined,
        dni: obj.dni ?? undefined,
        telefono: obj["teléfono"] ?? obj.telefono ?? undefined,
        coordinador: obj["coord."] ?? obj.coordinador ?? undefined,
      };
    }).filter((r) => r.email);

    const r = await fetch("/api/backend/students/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const result = await r.json() as { created?: number; skipped?: number; errors?: string[]; error?: string };
    if (!r.ok) {
      setImportStatus(`Error al importar: ${result.error ?? "Error del servidor"}`);
    } else {
      setImportStatus(`Importados: ${result.created ?? 0} · Saltados: ${result.skipped ?? 0}${result.errors?.length ? ` · Errores: ${result.errors.length}` : ""}`);
    }
    load();
    if (csvRef.current) csvRef.current.value = "";
  }

  const fi = (field: keyof typeof editData, label: string, type = "text") => (
    <div className="field" key={field}>
      <label>{label}</label>
      <input
        type={type}
        value={String(editData[field] ?? "")}
        onChange={(e) => setEditData((d) => ({ ...d, [field]: e.target.value }))}
      />
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Administración</span>
          <h1 className="page-title">Registro de estudiantes</h1>
          <p className="page-subtitle">Alta, edición y estado de los alumnos del seminario</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => csvRef.current?.click()} style={{ fontSize: 13 }}>
            Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} />
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)} style={{ fontSize: 13 }}>
            {showCreate ? "Cancelar" : "+ Nuevo estudiante"}
          </button>
        </div>
      </div>

      {importStatus && (
        <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{importStatus}</p>
      )}

      {/* Formulario de nuevo estudiante */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>Nuevo estudiante</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
                {(["email", "nombre", "apellido", "codigo", "dni", "telefono", "iglesia", "pais", "coordinador"] as const).map((f) => (
                  <div key={f} className="field">
                    <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <input
                      value={String(newStudent[f] ?? "")}
                      onChange={(e) => setNewStudent((d) => ({ ...d, [f]: e.target.value }))}
                      required={f === "email" || f === "nombre" || f === "apellido" || f === "dni"}
                    />
                  </div>
                ))}
                <div className="field">
                  <label>Modo</label>
                  <select
                    value={newStudent.modo ?? "SINCRONICO"}
                    onChange={(e) => setNewStudent((d) => ({ ...d, modo: e.target.value as ModoEstudio }))}
                  >
                    <option value="SINCRONICO">Sincrónico</option>
                    <option value="ASINCRONICO">Asincrónico</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </div>
                <div className="field">
                  <label>Semestre ingreso</label>
                  <input type="number" min={1} max={2}
                    onChange={(e) => setNewStudent((d) => ({ ...d, semestreIngreso: parseInt(e.target.value) || undefined }))} />
                </div>
                <div className="field">
                  <label>Año ingreso</label>
                  <input type="number" min={2000}
                    onChange={(e) => setNewStudent((d) => ({ ...d, anioIngreso: parseInt(e.target.value) || undefined }))} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--texto-tenue)" }}>
                La contrasena inicial del estudiante sera su DNI.
              </p>
              {createError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{createError}</p>
              )}
              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creando…" : "Crear estudiante"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buscador */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por código, nombre, email…"
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">Buscar</button>
      </form>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}

      {!loading && students.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <p className="empty-state-title">Sin estudiantes{query ? " con esa búsqueda" : ""}</p>
            <p>{query ? "Prueba con otro término." : "Crea el primer estudiante o importa un CSV."}</p>
          </div>
        </div>
      )}

      {/* Tabla de estudiantes */}
      {students.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                {["Cód.", "Apellidos", "Nombres", "Email", "Modo", "Iglesia", "País", "S/A", "DNI", "Teléfono", "Coordinador", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "var(--texto-secundario)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                editId === s.id ? (
                  <tr key={s.id} style={{ background: "#FFFDF5", borderBottom: "1px solid var(--borde)" }}>
                    <td colSpan={13} style={{ padding: 16 }}>
                      <form onSubmit={handleSaveEdit}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
                          {fi("codigo", "Código")}
                          {fi("apellido", "Apellidos")}
                          {fi("nombre", "Nombres")}
                          {fi("email", "Email")}
                          <div className="field">
                            <label>Modo</label>
                            <select value={editData.modo ?? "SINCRONICO"} onChange={(e) => setEditData((d) => ({ ...d, modo: e.target.value as ModoEstudio }))}>
                              <option value="SINCRONICO">Sincrónico</option>
                              <option value="ASINCRONICO">Asincrónico</option>
                              <option value="MIXTO">Mixto</option>
                            </select>
                          </div>
                          {fi("iglesia", "Iglesia")}
                          {fi("pais", "País")}
                          {fi("semestreIngreso", "Sem.")}
                          {fi("anioIngreso", "Año")}
                          {fi("dni", "DNI")}
                          {fi("telefono", "Teléfono")}
                          {fi("coordinador", "Coordinador")}
                          <div className="field">
                            <label>Estado</label>
                            <select value={editData.activo ? "true" : "false"} onChange={(e) => setEditData((d) => ({ ...d, activo: e.target.value === "true" }))}>
                              <option value="true">Activo (A)</option>
                              <option value="false">Inactivo (I)</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditId(null)}>Cancelar</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.codigo ?? "—"}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 500 }}>{s.apellido}</td>
                    <td style={{ padding: "7px 10px" }}>{s.nombre}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.email}</td>
                    <td style={{ padding: "7px 10px" }}>{MODO_LABEL[s.modo]}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.iglesia ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.pais ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.semestreIngreso ?? "—"}/{s.anioIngreso ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.dni ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.telefono ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.coordinador ?? "—"}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span className={`chip ${s.activo ? "chip-ok" : "chip-resumen"}`}>{s.activo ? "A" : "I"}</span>
                    </td>
                    <td style={{ padding: "7px 6px" }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => startEdit(s)}>Editar</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--texto-tenue)" }}>
        CSV esperado: CODIGO, NOMBRES, APELLIDOS, MODO, IGLESIA, PAIS, SEM., ANO, DNI, TELEFONO, CORREO, COORD. El DNI es obligatorio y sera la contrasena inicial.
      </div>
    </div>
  );
}
