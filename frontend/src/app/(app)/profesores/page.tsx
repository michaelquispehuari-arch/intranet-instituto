"use client";

import { useEffect, useRef, useState } from "react";
import { applyPhonePrefix, matchHeader, normalizeCsvHeader, parseCsv, readCsvFile, toTitleCase } from "@/lib/csv";
import { useTranslation } from "@/lib/i18n/LanguageContext";

function ordenarPorApellido<T extends { apellido: string; nombre: string }>(filas: T[]): T[] {
  return [...filas].sort((a, b) =>
    a.apellido.localeCompare(b.apellido, "es", { sensitivity: "base" }) ||
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
}

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
  const { t } = useTranslation();
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
      setProfesores(ordenarPorApellido(filtered));
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
      setStatus(t("profesores.createdTeacher"));
      load();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setCreateError(d.error ?? t("profesores.createErrorFallback"));
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
      setStatus(t("profesores.savedTeacher"));
      load();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setStatus(t("profesores.saveError", { error: d.error ?? t("profesores.serverErrorFallback") }));
    }
  }

  async function handleDelete(p: Profesor) {
    const ok = window.confirm(t("profesores.confirmDelete", { nombre: p.nombre, apellido: p.apellido }));
    if (!ok) return;
    const r = await fetch(`/api/backend/users/${p.id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({})) as { error?: string };
    setStatus(r.ok ? t("profesores.deletedTeacher") : d.error ?? t("profesores.deleteErrorFallback"));
    if (r.ok) load();
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(t("profesores.import.processing"));
    const text = await readCsvFile(file);
    const csvRows = parseCsv(text);
    const headers = (csvRows[0] ?? []).map(normalizeCsvHeader);
    const rows = csvRows.slice(1).map((cols) => {
      const pais = matchHeader(headers, cols, ["pais"]);
      const telefono = matchHeader(headers, cols, ["telefono", "celular"]);
      return {
        codigo: matchHeader(headers, cols, ["codigo"]) || undefined,
        nombre: toTitleCase(matchHeader(headers, cols, ["nombre"])),
        apellido: toTitleCase(matchHeader(headers, cols, ["apellido"])),
        email: matchHeader(headers, cols, ["correo", "mail"]),
        dni: matchHeader(headers, cols, ["dni", "documento"]) || undefined,
        telefono: applyPhonePrefix(telefono, pais),
      };
    }).filter((r) => r.email || r.nombre || r.apellido);

    const invalid = rows.filter((r) => !r.email || !r.nombre || !r.apellido);
    if (invalid.length > 0) {
      setStatus(t("profesores.import.invalidRows", { count: invalid.length }));
      if (csvRef.current) csvRef.current.value = "";
      return;
    }

    let created = 0, failed = 0;
    for (const row of rows) {
      const r = await fetch("/api/backend/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, ...(row.dni ? { password: row.dni } : {}), rol: "PROFESOR" }),
      });
      if (r.ok) created++; else failed++;
    }
    setStatus(t("profesores.import.result", { created, failed }));
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
          <span className="page-eyebrow">{t("profesores.eyebrow")}</span>
          <h1 className="page-title">{t("profesores.title")}</h1>
          <p className="page-subtitle">{t("profesores.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => csvRef.current?.click()} style={{ fontSize: 13 }}>
            {t("profesores.importCsv")}
          </button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} />
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)} style={{ fontSize: 13 }}>
            {showCreate ? t("profesores.cancel") : t("profesores.newTeacher")}
          </button>
        </div>
      </div>

      {status && (
        <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>
      )}

      {/* Formulario de nuevo profesor */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>{t("profesores.newTeacherCard.title")}</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
                {(["email", "nombre", "apellido", "codigo", "dni", "telefono"] as const).map((f) => (
                  <div key={f} className="field">
                    <label>{t(`profesores.fields.${f}`)}</label>
                    <input
                      value={String(newProfesor[f] ?? "")}
                      onChange={(e) => setNewProfesor((d) => ({ ...d, [f]: e.target.value }))}
                      required={f === "email" || f === "nombre" || f === "apellido" || f === "dni"}
                    />
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--texto-tenue)" }}>
                {t("profesores.newTeacherCard.passwordNote")}
              </p>
              {createError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{createError}</p>
              )}
              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("profesores.newTeacherCard.submitting") : t("profesores.newTeacherCard.submit")}
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
          placeholder={t("profesores.searchPlaceholder")}
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">{t("profesores.search")}</button>
      </form>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>{t("profesores.loading")}</p>}

      {!loading && profesores.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👨‍🏫</div>
            <p className="empty-state-title">{query ? t("profesores.emptyTitleFiltered") : t("profesores.emptyTitle")}</p>
            <p>{query ? t("profesores.emptySearchHint") : t("profesores.emptyCreateHint")}</p>
          </div>
        </div>
      )}

      {/* Tabla de profesores */}
      {profesores.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                {[t("profesores.table.codigo"), t("profesores.table.apellidos"), t("profesores.table.nombres"), t("profesores.table.email"), t("profesores.table.dni"), t("profesores.table.telefono"), t("profesores.table.estado"), ""].map((h) => (
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
                          {fi("codigo", t("profesores.editFields.codigo"))}
                          {fi("apellido", t("profesores.editFields.apellido"))}
                          {fi("nombre", t("profesores.editFields.nombre"))}
                          {fi("email", t("profesores.editFields.email"))}
                          {fi("dni", t("profesores.editFields.dni"))}
                          {fi("telefono", t("profesores.editFields.telefono"))}
                          <div className="field">
                            <label>{t("profesores.editFields.estado")}</label>
                            <select
                              value={editData.activo ? "true" : "false"}
                              onChange={(e) => setEditData((d) => ({ ...d, activo: e.target.value === "true" }))}
                            >
                              <option value="true">{t("profesores.statusActive")}</option>
                              <option value="false">{t("profesores.statusInactive")}</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={saving}>
                            {saving ? t("profesores.saving") : t("profesores.save")}
                          </button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditId(null)}>
                            {t("profesores.cancel")}
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
                      <span className={`chip ${p.activo ? "chip-ok" : "chip-resumen"}`}>{p.activo ? t("profesores.chipActive") : t("profesores.chipInactive")}</span>
                    </td>
                    <td style={{ padding: "7px 6px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => startEdit(p)}>
                          {t("profesores.edit")}
                        </button>
                        {p.activo && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "3px 8px", color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                            onClick={() => handleDelete(p)}
                          >
                            {t("profesores.delete")}
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
        {t("profesores.csvHelp")}
      </div>
    </div>
  );
}
