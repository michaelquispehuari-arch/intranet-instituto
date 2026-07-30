"use client";

import { useEffect, useRef, useState } from "react";
import { applyPhonePrefix, matchHeader, normalizeCsvHeader, parseCsv, parseFlexibleDate, readCsvFile, toTitleCase } from "@/lib/csv";
import { useTranslation } from "@/lib/i18n/LanguageContext";

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

function parseOptionalInt(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function findEmail(cols: string[]) {
  return cols.find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))?.trim() ?? "";
}

function isValidEmail(value: string | undefined) {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function EstudiantesPage() {
  const { t } = useTranslation();
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
      setCreateError(d.error ?? t("estudiantes.createErrorFallback"));
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
    setImportStatus("");
    const payload = {
      ...editData,
      semestreIngreso: parseOptionalInt(editData.semestreIngreso),
      anioIngreso: parseOptionalInt(editData.anioIngreso),
    };
    const response = await fetch(`/api/backend/students/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (response.ok) {
      setEditId(null);
      setImportStatus(t("estudiantes.savedStudent"));
      load();
    } else {
      const data = await response.json().catch(() => ({})) as { error?: string };
      setImportStatus(t("estudiantes.saveError", { error: data.error ?? t("estudiantes.serverErrorFallback") }));
    }
  }

  async function handleDeleteStudent(student: Estudiante) {
    const ok = window.confirm(t("estudiantes.confirmDelete", { nombre: student.nombre, apellido: student.apellido }));
    if (!ok) return;

    const response = await fetch(`/api/backend/students/${student.id}`, { method: "DELETE" });
    if (response.ok) {
      setImportStatus(t("estudiantes.deletedStudent"));
      load();
      return;
    }

    const data = await response.json().catch(() => ({})) as { error?: string };
    setImportStatus(t("estudiantes.deleteError", { error: data.error ?? t("estudiantes.serverErrorFallback") }));
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(t("estudiantes.import.processing"));

    const text = await readCsvFile(file);
    const csvRows = parseCsv(text);
    const headers = (csvRows[0] ?? []).map(normalizeCsvHeader);

    if (headers.length === 0) {
      setImportStatus(t("estudiantes.import.noHeaders"));
      return;
    }

    const rows = csvRows.slice(1).map((cols) => {
      const modoRaw = normalizeCsvHeader(matchHeader(headers, cols, ["modo"])).toUpperCase();
      const modo = (["SINCRONICO", "ASINCRONICO", "MIXTO"].includes(modoRaw) ? modoRaw : "SINCRONICO") as ModoEstudio;
      const email = matchHeader(headers, cols, ["correo", "mail"]) || findEmail(cols);
      const pais = matchHeader(headers, cols, ["pais"]);
      const telefono = matchHeader(headers, cols, ["telefono", "celular"]);
      return {
        email,
        nombre: toTitleCase(matchHeader(headers, cols, ["nombre"])),
        apellido: toTitleCase(matchHeader(headers, cols, ["apellido"])),
        codigo: matchHeader(headers, cols, ["codigo"]) || undefined,
        modo,
        iglesia: toTitleCase(matchHeader(headers, cols, ["iglesia"])) || undefined,
        pais: toTitleCase(pais) || undefined,
        semestreIngreso: parseOptionalInt(matchHeader(headers, cols, ["semestre", "sem"])),
        anioIngreso: parseOptionalInt(matchHeader(headers, cols, ["ano", "anio"])),
        dni: matchHeader(headers, cols, ["dni", "documento"]) || undefined,
        telefono: applyPhonePrefix(telefono, pais),
        fechaNacimiento: parseFlexibleDate(matchHeader(headers, cols, ["nacimiento"])),
        coordinador: toTitleCase(matchHeader(headers, cols, ["coordinador", "coord"])) || undefined,
      };
    }).filter((r) => r.email || r.nombre || r.apellido);

    if (rows.length === 0) {
      setImportStatus(t("estudiantes.import.noRows", { headers: headers.join(" | ") }));
      return;
    }

    const validRows = rows.filter((r) => isValidEmail(r.email) && r.nombre && r.apellido);
    const invalid = rows.filter((r) => !isValidEmail(r.email) || !r.nombre || !r.apellido);
    if (validRows.length === 0 && invalid.length > 0) {
      const sample = invalid[0];
      setImportStatus(t("estudiantes.import.invalidRows", {
        count: invalid.length,
        email: sample.email || "-",
        nombre: sample.nombre || "-",
        apellido: sample.apellido || "-",
        headers: headers.join(" | "),
      }));
      return;
    }

    const r = await fetch("/api/backend/students/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: validRows }),
    });
    const result = await r.json() as { created?: number; skipped?: number; errors?: string[]; error?: string };
    if (!r.ok) {
      setImportStatus(t("estudiantes.import.error", { error: result.error ?? t("estudiantes.serverErrorFallback") }));
    } else {
      let msg = t("estudiantes.import.result", { created: result.created ?? 0, skipped: (result.skipped ?? 0) + invalid.length });
      if (invalid.length) msg += t("estudiantes.import.incomplete", { count: invalid.length });
      if (result.errors?.length) msg += t("estudiantes.import.errors", { count: result.errors.length });
      setImportStatus(msg);
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
          <span className="page-eyebrow">{t("estudiantes.eyebrow")}</span>
          <h1 className="page-title">{t("estudiantes.title")}</h1>
          <p className="page-subtitle">{t("estudiantes.subtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => csvRef.current?.click()} style={{ fontSize: 13 }}>
            {t("estudiantes.importCsv")}
          </button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} />
          <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)} style={{ fontSize: 13 }}>
            {showCreate ? t("estudiantes.cancel") : t("estudiantes.newStudent")}
          </button>
        </div>
      </div>

      {importStatus && (
        <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{importStatus}</p>
      )}

      {/* Formulario de nuevo estudiante */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3>{t("estudiantes.newStudentCard.title")}</h3></div>
          <div className="card-body">
            <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 12 }}>
                {(["email", "nombre", "apellido", "codigo", "dni", "telefono", "iglesia", "pais", "coordinador"] as const).map((f) => (
                  <div key={f} className="field">
                    <label>{t(`estudiantes.fields.${f}`)}</label>
                    <input
                      value={String(newStudent[f] ?? "")}
                      onChange={(e) => setNewStudent((d) => ({ ...d, [f]: e.target.value }))}
                      required={f === "email" || f === "nombre" || f === "apellido" || f === "dni"}
                    />
                  </div>
                ))}
                <div className="field">
                  <label>{t("estudiantes.fields.modo")}</label>
                  <select
                    value={newStudent.modo ?? "SINCRONICO"}
                    onChange={(e) => setNewStudent((d) => ({ ...d, modo: e.target.value as ModoEstudio }))}
                  >
                    <option value="SINCRONICO">{t("estudiantes.modo.SINCRONICO")}</option>
                    <option value="ASINCRONICO">{t("estudiantes.modo.ASINCRONICO")}</option>
                    <option value="MIXTO">{t("estudiantes.modo.MIXTO")}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t("estudiantes.fields.semestreIngreso")}</label>
                  <input type="number" min={1} max={2}
                    onChange={(e) => setNewStudent((d) => ({ ...d, semestreIngreso: parseInt(e.target.value) || undefined }))} />
                </div>
                <div className="field">
                  <label>{t("estudiantes.fields.anioIngreso")}</label>
                  <input type="number" min={2000}
                    onChange={(e) => setNewStudent((d) => ({ ...d, anioIngreso: parseInt(e.target.value) || undefined }))} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--texto-tenue)" }}>
                {t("estudiantes.newStudentCard.passwordNote")}
              </p>
              {createError && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{createError}</p>
              )}
              <div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("estudiantes.newStudentCard.submitting") : t("estudiantes.newStudentCard.submit")}</button>
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
          placeholder={t("estudiantes.searchPlaceholder")}
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">{t("estudiantes.search")}</button>
      </form>

      {loading && <p style={{ color: "var(--texto-tenue)" }}>{t("estudiantes.loading")}</p>}

      {!loading && students.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <p className="empty-state-title">{query ? t("estudiantes.emptyTitleFiltered") : t("estudiantes.emptyTitle")}</p>
            <p>{query ? t("estudiantes.emptySearchHint") : t("estudiantes.emptyCreateHint")}</p>
          </div>
        </div>
      )}

      {/* Tabla de estudiantes */}
      {students.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                {[t("estudiantes.table.codigo"), t("estudiantes.table.apellidos"), t("estudiantes.table.nombres"), t("estudiantes.table.email"), t("estudiantes.table.modo"), t("estudiantes.table.iglesia"), t("estudiantes.table.pais"), t("estudiantes.table.semestreAnio"), t("estudiantes.table.dni"), t("estudiantes.table.telefono"), t("estudiantes.table.coordinador"), t("estudiantes.table.estado"), ""].map((h) => (
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
                          {fi("codigo", t("estudiantes.editFields.codigo"))}
                          {fi("apellido", t("estudiantes.editFields.apellido"))}
                          {fi("nombre", t("estudiantes.editFields.nombre"))}
                          {fi("email", t("estudiantes.editFields.email"))}
                          <div className="field">
                            <label>{t("estudiantes.editFields.modo")}</label>
                            <select value={editData.modo ?? "SINCRONICO"} onChange={(e) => setEditData((d) => ({ ...d, modo: e.target.value as ModoEstudio }))}>
                              <option value="SINCRONICO">{t("estudiantes.modo.SINCRONICO")}</option>
                              <option value="ASINCRONICO">{t("estudiantes.modo.ASINCRONICO")}</option>
                              <option value="MIXTO">{t("estudiantes.modo.MIXTO")}</option>
                            </select>
                          </div>
                          {fi("iglesia", t("estudiantes.editFields.iglesia"))}
                          {fi("pais", t("estudiantes.editFields.pais"))}
                          {fi("semestreIngreso", t("estudiantes.editFields.semestre"))}
                          {fi("anioIngreso", t("estudiantes.editFields.anio"))}
                          {fi("dni", t("estudiantes.editFields.dni"))}
                          {fi("telefono", t("estudiantes.editFields.telefono"))}
                          {fi("coordinador", t("estudiantes.editFields.coordinador"))}
                          <div className="field">
                            <label>{t("estudiantes.editFields.estado")}</label>
                            <select value={editData.activo ? "true" : "false"} onChange={(e) => setEditData((d) => ({ ...d, activo: e.target.value === "true" }))}>
                              <option value="true">{t("estudiantes.statusActive")}</option>
                              <option value="false">{t("estudiantes.statusInactive")}</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={saving}>{saving ? t("estudiantes.saving") : t("estudiantes.save")}</button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditId(null)}>{t("estudiantes.cancel")}</button>
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
                    <td style={{ padding: "7px 10px" }}>{t(`estudiantes.modo.${s.modo}`)}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.iglesia ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.pais ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.semestreIngreso ?? "—"}/{s.anioIngreso ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.dni ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.telefono ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: "var(--texto-tenue)" }}>{s.coordinador ?? "—"}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span className={`chip ${s.activo ? "chip-ok" : "chip-resumen"}`}>{s.activo ? t("estudiantes.chipActive") : t("estudiantes.chipInactive")}</span>
                    </td>
                    <td style={{ padding: "7px 6px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => startEdit(s)}>{t("estudiantes.edit")}</button>
                        {s.activo && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: "3px 8px", color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                            onClick={() => handleDeleteStudent(s)}
                          >
                            {t("estudiantes.delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--texto-tenue)" }}>
        {t("estudiantes.csvHelp1")}
        {t("estudiantes.csvHelp2")}
      </div>
    </div>
  );
}
