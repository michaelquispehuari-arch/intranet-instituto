"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Rol = "ADMIN" | "PROFESOR" | "ESTUDIANTE";

type UserItem = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
  codigo: string | null;
  dni: string | null;
  telefono: string | null;
};

type UserDraft = Pick<UserItem, "email" | "nombre" | "apellido" | "rol" | "activo"> & {
  codigo: string;
  dni: string;
  telefono: string;
  password: string;
};

const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Admin",
  PROFESOR: "Profesor",
  ESTUDIANTE: "Estudiante",
};

const EMPTY_NEW_USER: UserDraft = {
  email: "",
  nombre: "",
  apellido: "",
  rol: "ADMIN",
  activo: true,
  codigo: "",
  dni: "",
  telefono: "",
  password: "",
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState<UserDraft>(EMPTY_NEW_USER);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/backend/users");
    if (response.ok) {
      const data = await response.json() as { users?: UserItem[] };
      const loaded = data.users ?? [];
      setUsers(loaded);
      setDrafts(Object.fromEntries(loaded.map((u) => [u.id, toDraft(u)])));
    } else {
      const data = await response.json().catch(() => ({})) as { error?: string };
      setStatus(data.error ?? "Error al cargar usuarios");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const response = await fetch("/api/backend/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        rol: newUser.rol,
        codigo: newUser.codigo || undefined,
        dni: newUser.dni || undefined,
        telefono: newUser.telefono || undefined,
      }),
    });
    setCreating(false);

    if (response.ok) {
      setShowCreate(false);
      setNewUser(EMPTY_NEW_USER);
      load();
      return;
    }

    const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
    setCreateError(data.error ?? data.message ?? "Error al crear usuario");
  }

  function updateDraft(id: string, field: keyof UserDraft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function saveUser(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setStatus("Guardando...");

    const body: Record<string, unknown> = {
      email: draft.email,
      nombre: draft.nombre,
      apellido: draft.apellido,
      rol: draft.rol,
      activo: draft.activo,
      codigo: draft.codigo,
      dni: draft.dni,
      telefono: draft.telefono,
    };
    if (draft.password.trim()) body.password = draft.password.trim();

    const response = await fetch(`/api/backend/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    setStatus(response.ok ? "Usuario guardado." : data.error ?? "Error al guardar usuario");
    if (response.ok) load();
  }

  const filtered = users.filter((u) =>
    [u.codigo, u.nombre, u.apellido, u.email, u.rol, u.activo ? "activo" : "inactivo"]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="page-eyebrow">Administracion</span>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Cuentas del sistema en formato de edicion lineal</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Nuevo usuario</h3>
          </div>
          <form className="card-body" onSubmit={createUser} style={{ display: "grid", gap: 14 }}>
            <div className="form-grid">
              <label className="field">
                <span>Nombres</span>
                <input required minLength={2} maxLength={80} value={newUser.nombre} onChange={(e) => setNewUser((p) => ({ ...p, nombre: e.target.value }))} />
              </label>
              <label className="field">
                <span>Apellidos</span>
                <input required minLength={2} maxLength={80} value={newUser.apellido} onChange={(e) => setNewUser((p) => ({ ...p, apellido: e.target.value }))} />
              </label>
              <label className="field">
                <span>Email</span>
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label className="field">
                <span>Contraseña</span>
                <input required type="password" minLength={8} maxLength={100} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
              </label>
              <label className="field">
                <span>Rol</span>
                <select value={newUser.rol} onChange={(e) => setNewUser((p) => ({ ...p, rol: e.target.value as Rol }))}>
                  {(Object.keys(ROL_LABEL) as Rol[]).map((rol) => (
                    <option key={rol} value={rol}>{ROL_LABEL[rol]}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Código (opcional)</span>
                <input maxLength={30} value={newUser.codigo} onChange={(e) => setNewUser((p) => ({ ...p, codigo: e.target.value }))} />
              </label>
            </div>
            {createError && <p style={{ margin: 0, fontSize: 13, color: "var(--desaprobado-texto)" }}>{createError}</p>}
            <div className="card-actions">
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? "Creando…" : "Crear usuario"}</button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por codigo, nombre, email, rol o estado..."
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
      </form>

      {status && <p style={{ fontSize: 13, color: "var(--texto-secundario)", marginBottom: 12 }}>{status}</p>}
      {loading && <p style={{ color: "var(--texto-tenue)" }}>Cargando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state-title">Sin usuarios</p>
            <p>Registra estudiantes o profesores desde sus pestanas respectivas.</p>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--borde)", background: "#FAFAF8" }}>
                {["Codigo", "Apellidos", "Nombres", "Email", "Rol", "DNI", "Telefono", "Estado", "Nueva clave", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap", color: "var(--texto-secundario)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const draft = drafts[user.id] ?? toDraft(user);
                return (
                  <tr key={user.id} style={{ borderBottom: "0.5px solid var(--borde)" }}>
                    <CellInput value={draft.codigo} onChange={(v) => updateDraft(user.id, "codigo", v)} />
                    <CellInput value={draft.apellido} onChange={(v) => updateDraft(user.id, "apellido", v)} required />
                    <CellInput value={draft.nombre} onChange={(v) => updateDraft(user.id, "nombre", v)} required />
                    <CellInput value={draft.email} onChange={(v) => updateDraft(user.id, "email", v)} type="email" required />
                    <td style={{ padding: 6 }}>
                      <select value={draft.rol} onChange={(e) => updateDraft(user.id, "rol", e.target.value as Rol)} style={cellStyle}>
                        {(Object.keys(ROL_LABEL) as Rol[]).map((rol) => (
                          <option key={rol} value={rol}>{ROL_LABEL[rol]}</option>
                        ))}
                      </select>
                    </td>
                    <CellInput value={draft.dni} onChange={(v) => updateDraft(user.id, "dni", v)} />
                    <CellInput value={draft.telefono} onChange={(v) => updateDraft(user.id, "telefono", v)} />
                    <td style={{ padding: 6 }}>
                      <select value={String(draft.activo)} onChange={(e) => updateDraft(user.id, "activo", e.target.value === "true")} style={cellStyle}>
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                      </select>
                    </td>
                    <CellInput value={draft.password} onChange={(v) => updateDraft(user.id, "password", v)} type="password" placeholder="Sin cambio" />
                    <td style={{ padding: 6 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => saveUser(user.id)}>
                        Guardar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function toDraft(user: UserItem): UserDraft {
  return {
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
    activo: user.activo,
    codigo: user.codigo ?? "",
    dni: user.dni ?? "",
    telefono: user.telefono ?? "",
    password: "",
  };
}

function CellInput(props: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <td style={{ padding: 6 }}>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        type={props.type ?? "text"}
        required={props.required}
        placeholder={props.placeholder}
        style={cellStyle}
      />
    </td>
  );
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
