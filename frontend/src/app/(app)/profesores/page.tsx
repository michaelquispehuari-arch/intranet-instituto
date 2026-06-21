"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeCsvHeader, parseCsv, readCsvFile } from "@/lib/csv";

type Profesor = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  activo: boolean;
  codigo: string | null;
  dni: string | null;
  telefono: string | null;
};

type EditData = {
  nombre: string;
  apellido: string;
  email: string;
  codigo: string;
  dni: string;
  telefono: string;
  activo: boolean;
};

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditData>({
    nombre: "", apellido: "", email: "", codigo: "", dni: "", telefono: "", activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newProfesor, setNewProfesor] = useState<Partial<EditData>>({});
  const [status, setStatus] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  async function load(q = query) {
    setLoading(true);
    const r = await fetch("/api/backend/users");
    if (r.ok) {
      const d = await r.json() as { users?: Profesor[] };
      const all = (d.users ?? []).filter((u) => u.rol === "PROFESOR");
      const filtered = q
        ? all.filter((p) =>
            [p.codigo, p.nombre, p.apellido, p.email, p.dni].join(" ").toLowerCase().includes(q.toLowerCase()),
          )
        : all;
      setProfesores(filtered);
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
    const r = await fetch("/api/backend/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newProfesor.email,
        password: newProfesor.dni,
        nombre: newProfesor.nombre,
        apellido: newProfesor.apellido,
        rol: "PROFESOR",
        codigo: newProfesor.codigo,
        dni: newProfesor.dni,
        telefono: newProfesor.telefono,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setShowCreate(false);
      setNewProfesor({});
      setStatus("Profesor creado. La contraseña inicial es su DNI.");
      load();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setCreateError(d.error ?? "Error al crear profesor");
    }
  }

  function startEdit(p: Profesor) {
    setEditId(p.id);
    setEditData({
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      codigo: p.codigo ?? "",
      dni: p.dni ?? "",
      telefono: p.telefono ?? "",
      activo: p.activo,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setStatus("");
    const r = await fetch(`/api/backend/users/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editData, rol: "PROFESOR" }),
    });
    setSaving(false);
    if (r.ok) {
      setEditId(null);
      setStatus("Profesor guardado.");
      load();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setStatus(`Error al guardar: ${d.error ?? "Error del servidor"}`);
    }
  }

  async function handleDelete(p: Profesor) {
    const ok = window.confirm(`Eliminar profesor ${p.nombre} ${p.apellido}? La cuenta quedará inactiva.`);
    if (!ok) return;
    const r = await fetch(`/api/backend/users/${p.id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({})) as { error?: string };
    setStatus(r.ok ? "Profesor eliminado." : d.error ?? "Error al eliminar");
    if (r.ok) load();
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Procesando…");
    const text = await readCsvFile(file);
    const csvRows = parseCsv(text);
    const headers = (csvRows[0] ?? []).map(normalizeCsvHeader);
    const rows = csvRows.slice(1).map((cols) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
      return {
        codigo: obj.codigo ?? "",
        nombre: obj.nombres ?? obj.nombre ?? "",
        apellido: obj.apellidos ?? obj.apellido ?? "",
        email: obj.correo ?? obj.email ?? "",
        dni: obj.dni ?? "",
        telefono: obj.telefono ?? "",
      };
    }).filter((r) => r.email || r.nombre || r.apellido || r.dni);

    const invalid = rows.filter((r) => !r.email || !r.nombre || !r.apellido || !r.dni);
    if (invalid.length > 0) {
      setStatus(`Error: ${invalid.length} fila(s) sin CORREO, NOMBRES, APELLIDOS o DNI.`);
      if (csvRef.current) csvRef.current.value = "";
      return;
    }

    let created = 0, failed = 0;
    for (const row of rows) {
      const r = await fetch("/api/backend/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, password: row.dni, rol: "PROFESOR" }),
      });
      if (r.ok) created++; else failed++;
    }
    setStatus(`Importados: ${created} · Errores: ${failed}`);
    if (csvRef.current) csvRef.current.value = "";
    load();
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
          <h1 className="page-title">Registro de profesores</h1>
          <p className="page-subtitle">Alta, edición y estado de los docentes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => csvRef.current?.click()} style={{ fontSize: 13 }}>
            Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} />
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)} style={{ fontSize: 13 }}>
            {showCreate ? "Cancelar" : "+ Nuevo profesor"}
          </button>
        </div>
      </div>

      {status && (
        <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>
      )}

      {/* Formulario de nuevo profesor */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>Nuevo profesor</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
                {(["email", "nombre", "apellido", "codigo", "dni", "telefono"] as const).map((f) => (
                  <div key={f} className="field">
                    <label>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <input
                      value={String(newProfesor[f] ?? "")}
                      onChange={(e) => setNewProfesor((d) => ({ ...d, [f]: e.target.value }))}
                      required={f === "email" || f === "nombre" || f === "apellido" || f === "dni"}
                    />
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--texto-tenue)" }}>
                La contraseña inicial del profesor será su DNI.
              </p>
              {createError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{createError}</p>
              )}
              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creando…" : "Crear profesor"}
                </button>
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
          placeholder="Buscar por código, nombre, correo o DNI…"
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">Buscar</button>
      </form>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando…</p>}

      {!loading && profesores.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👨‍🏫</div>
            <p className="empty-state-title">Sin profesores{query ? " con esa búsqueda" : ""}</p>
            <p>{query ? "Prueba con otro término." : "Crea el primer profesor o importa un CSV."}</p>
          </div>
        </div>
      )}

      {/* Tabla de profesores */}
      {profesores.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                {["Cód.", "Apellidos", "Nombres", "Email", "DNI", "Teléfono", "Estado", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "var(--texto-secundario)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profesores.map((p) =>
                editId === p.id ? (
                  <tr key={p.id} style={{ background: "#FFFDF5", borderBottom: "1px solid var(--borde)" }}>
                    <td colSpan={8} style={{ padding: 16 }}>
                      <form onSubmit={handleSaveEdit}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
                          {fi("codigo", "Código")}
                          {fi("apellido", "Apellidos")}
                          {fi("nombre", "Nombres")}
                          {fi("email", "Email")}
                          {fi("dni", "DNI")}
                          {fi("telefono", "Teléfono")}
                          <div className="field">
                            <label>Estado</label>
                            <select
                              value={editData.activo ? "true" : "false"}
                              onChange={(e) => setEditData((d) => ({ ...d, activo: e.target.value === "true" }))}
                            >
                              <option value="true">Activo (A)</option>
                              <option value="false">Inactivo (I)</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={saving}>
                            {saving ? "Guardando…" : "Guardar"}
                          </button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{p.codigo ?? "—"}</td>
                    <td style={{ padding: "7px 10px", fontWeight: 500 }}>{p.apellido}</td>
                    <td style={{ padding: "7px 10px" }}>{p.nombre}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{p.email}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{p.dni ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{p.telefono ?? "—"}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span className={`chip ${p.activo ? "chip-ok" : "chip-resumen"}`}>{p.activo ? "A" : "I"}</span>
                    </td>
                    <td style={{ padding: "7px 6px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => startEdit(p)}>
                          Editar
                        </button>
                        {p.activo && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "3px 8px", color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                            onClick={() => handleDelete(p)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--texto-tenue)" }}>
        CSV esperado: CODIGO, NOMBRES, APELLIDOS, CORREO, DNI, TELEFONO. El DNI es obligatorio y será la contraseña inicial.
      </div>
    </div>
  );
}
