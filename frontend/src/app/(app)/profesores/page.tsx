"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

type Draft = {
  codigo: string;
  apellido: string;
  nombre: string;
  email: string;
  dni: string;
  telefono: string;
  activo: boolean;
};

const emptyDraft: Draft = {
  codigo: "",
  apellido: "",
  nombre: "",
  email: "",
  dni: "",
  telefono: "",
  activo: true,
};

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newRow, setNewRow] = useState<Draft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/backend/users");
    if (response.ok) {
      const data = await response.json() as { users?: Profesor[] };
      const loaded = (data.users ?? []).filter((u) => u.rol === "PROFESOR");
      setProfesores(loaded);
      setDrafts(Object.fromEntries(loaded.map((u) => [u.id, toDraft(u)])));
    } else {
      const data = await response.json().catch(() => ({})) as { error?: string };
      setStatus(data.error ?? "Error al cargar profesores");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function updateDraft(id: string, field: keyof Draft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function createProfessor(row: Draft) {
    if (!row.email || !row.nombre || !row.apellido || !row.dni) {
      setStatus("Faltan CORREO, NOMBRES, APELLIDOS o DNI.");
      return false;
    }

    const response = await fetch("/api/backend/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        password: row.dni,
        nombre: row.nombre,
        apellido: row.apellido,
        rol: "PROFESOR",
        codigo: row.codigo,
        dni: row.dni,
        telefono: row.telefono,
      }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setStatus(data.error ?? `Error al crear ${row.email}`);
      return false;
    }
    return true;
  }

  async function saveNewRow() {
    setStatus("Creando profesor...");
    if (await createProfessor(newRow)) {
      setStatus("Profesor creado. La contrasena inicial es su DNI.");
      setNewRow(emptyDraft);
      load();
    }
  }

  async function saveProfessor(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setStatus("Guardando...");
    const response = await fetch(`/api/backend/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: draft.email,
        nombre: draft.nombre,
        apellido: draft.apellido,
        rol: "PROFESOR",
        activo: draft.activo,
        codigo: draft.codigo,
        dni: draft.dni,
        telefono: draft.telefono,
      }),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setStatus(response.ok ? "Profesor guardado." : data.error ?? "Error al guardar profesor");
    if (response.ok) load();
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Procesando CSV...");

    const csvRows = parseCsv(await readCsvFile(file));
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
        activo: (obj.activo ?? "A").toUpperCase() !== "I",
      };
    }).filter((r) => r.email || r.dni || r.nombre || r.apellido);

    const invalid = rows.filter((r) => !r.email || !r.nombre || !r.apellido || !r.dni);
    if (invalid.length > 0) {
      setStatus(`Error al importar: ${invalid.length} fila(s) sin CORREO, NOMBRES, APELLIDOS o DNI.`);
      return;
    }

    let created = 0;
    let failed = 0;
    for (const row of rows) {
      if (await createProfessor(row)) created++;
      else failed++;
    }

    setStatus(`Importados: ${created}. Errores: ${failed}.`);
    if (csvRef.current) csvRef.current.value = "";
    load();
  }

  const filtered = profesores.filter((p) =>
    [p.codigo, p.nombre, p.apellido, p.email, p.dni]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Administracion</span>
          <h1 className="page-title">Registro de profesores</h1>
          <p className="page-subtitle">Alta y edicion lineal de cuentas docentes</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => csvRef.current?.click()} style={{ fontSize: 13 }}>
            Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} />
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por codigo, nombre, correo o DNI..."
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
      </form>

      {status && <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>}
      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando...</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
              {["Codigo", "Apellidos", "Nombres", "Correo", "DNI", "Telefono", "Estado", ""].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "var(--texto-secundario)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ProfessorRow draft={newRow} onChange={(f, v) => setNewRow((d) => ({ ...d, [f]: v }))} onSave={saveNewRow} isNew />
            {filtered.map((profesor) => {
              const draft = drafts[profesor.id] ?? toDraft(profesor);
              return (
                <ProfessorRow
                  key={profesor.id}
                  draft={draft}
                  onChange={(f, v) => updateDraft(profesor.id, f, v)}
                  onSave={() => saveProfessor(profesor.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfessorRow(props: {
  draft: Draft;
  onChange: (field: keyof Draft, value: string | boolean) => void;
  onSave: () => void;
  isNew?: boolean;
}) {
  return (
    <tr style={{ borderBottom: "0.5px solid var(--borde)", background: props.isNew ? "#FFFDF5" : undefined }}>
      <Cell value={props.draft.codigo} onChange={(v) => props.onChange("codigo", v)} />
      <Cell value={props.draft.apellido} onChange={(v) => props.onChange("apellido", v)} required />
      <Cell value={props.draft.nombre} onChange={(v) => props.onChange("nombre", v)} required />
      <Cell value={props.draft.email} onChange={(v) => props.onChange("email", v)} type="email" required />
      <Cell value={props.draft.dni} onChange={(v) => props.onChange("dni", v)} required />
      <Cell value={props.draft.telefono} onChange={(v) => props.onChange("telefono", v)} />
      <td style={{ padding: 6 }}>
        <select value={String(props.draft.activo)} onChange={(e) => props.onChange("activo", e.target.value === "true")} style={cellStyle}>
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </td>
      <td style={{ padding: 6 }}>
        <button className={props.isNew ? "btn btn-primary" : "btn btn-secondary"} style={{ fontSize: 12, padding: "4px 8px" }} onClick={props.onSave}>
          {props.isNew ? "Crear" : "Guardar"}
        </button>
      </td>
    </tr>
  );
}

function Cell(props: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <td style={{ padding: 6 }}>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        type={props.type ?? "text"}
        required={props.required}
        style={cellStyle}
      />
    </td>
  );
}

function toDraft(profesor: Profesor): Draft {
  return {
    codigo: profesor.codigo ?? "",
    apellido: profesor.apellido,
    nombre: profesor.nombre,
    email: profesor.email,
    dni: profesor.dni ?? "",
    telefono: profesor.telefono ?? "",
    activo: profesor.activo,
  };
}

const cellStyle: CSSProperties = {
  width: "100%",
  minWidth: 120,
  border: "0.5px solid var(--borde)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  background: "#fff",
};
