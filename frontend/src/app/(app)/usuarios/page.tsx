import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendDelete, backendGet, backendPatch, backendPost } from "@/lib/backend";

type UsersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

type UserItem = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  activo: boolean;
  creadoEn: string;
  _count: {
    cursosComoProfesor: number;
    inscripciones: number;
    examenesSub: number;
    materialesSubidos: number;
  };
};

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  PROFESOR: "Profesor",
  ESTUDIANTE: "Estudiante",
};

async function createUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ADMIN") redirect("/login");
  await backendPost("/api/users", session, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    apellido: String(formData.get("apellido") ?? ""),
    rol: String(formData.get("rol") ?? "ESTUDIANTE"),
  });
  redirect("/usuarios");
}

async function updateUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ADMIN") redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  await backendPatch(`/api/users/${userId}`, session, {
    email: String(formData.get("email") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    apellido: String(formData.get("apellido") ?? ""),
    rol: String(formData.get("rol") ?? "ESTUDIANTE"),
    activo: String(formData.get("activo") ?? "false") === "true",
    ...(password ? { password } : {}),
  });
  redirect("/usuarios");
}

async function deactivateUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  if (!session || session.user.rol !== "ADMIN") redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  await backendDelete(`/api/users/${userId}`, session);
  redirect("/usuarios");
}

export default async function UsuariosPage({ searchParams }: UsersPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.rol !== "ADMIN") redirect("/inicio");

  let data: { users: UserItem[] };
  try {
    data = await backendGet<{ users: UserItem[] }>("/api/users", session);
  } catch (err) {
    if (err instanceof BackendRequestError && err.statusCode === 401) redirect("/login");
    return (
      <div className="card">
        <div className="empty-state">
          <p className="empty-state-title">Error al cargar usuarios</p>
          <p style={{ color: "var(--texto-tenue)" }}>{err instanceof Error ? err.message : "Error del servidor"}</p>
        </div>
      </div>
    );
  }
  const query = ((await searchParams)?.q ?? "").trim().toLowerCase();
  const users = query
    ? data.users.filter((u) =>
        [u.nombre, u.apellido, u.email, u.rol, u.activo ? "activo" : "inactivo"]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : data.users;

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Administración</span>
        <h1 className="page-title">Gestión de usuarios</h1>
        <p className="page-subtitle">Altas, roles y estado de acceso</p>
      </div>

      {/* Nuevo usuario */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Nuevo usuario</h2>
        </div>
        <div className="card-body">
          <form action={createUser} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              <div className="field">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div className="field">
                <label>Contraseña inicial</label>
                <input name="password" type="password" minLength={8} required />
              </div>
              <div className="field">
                <label>Nombre</label>
                <input name="nombre" minLength={2} maxLength={80} required />
              </div>
              <div className="field">
                <label>Apellido</label>
                <input name="apellido" minLength={2} maxLength={80} required />
              </div>
              <div className="field">
                <label>Rol</label>
                <select name="rol" defaultValue="ESTUDIANTE" required>
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="PROFESOR">Profesor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <button type="submit" className="btn btn-primary">Crear usuario</button>
            </div>
          </form>
        </div>
      </div>

      {/* Buscador */}
      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, email, rol o estado…"
          style={{ flex: 1, border: "0.5px solid var(--borde)", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
        />
        <button type="submit" className="btn btn-secondary">Filtrar</button>
      </form>

      {/* Lista de usuarios */}
      {users.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p className="empty-state-title">Sin usuarios{query ? " con esa búsqueda" : ""}</p>
            <p>{query ? "Prueba con otro término." : "Crea el primer usuario con el formulario de arriba."}</p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {users.map((user) => (
          <div key={user.id} className="card">
            <div className="card-header" style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    {user.nombre} {user.apellido}
                  </span>
                  <span className={`chip ${user.activo ? "chip-ok" : "chip-resumen"}`}>
                    {user.activo ? ROL_LABEL[user.rol] : "Inactivo"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>{user.email}</div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--texto-secundario)" }}>
                <span>Cursos: {user._count.cursosComoProfesor}</span>
                <span>Inscripciones: {user._count.inscripciones}</span>
                <span>Envíos: {user._count.examenesSub}</span>
              </div>
            </div>

            <div className="card-body">
              <form action={updateUser}>
                <input name="userId" type="hidden" value={user.id} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div className="field">
                    <label>Email</label>
                    <input name="email" type="email" defaultValue={user.email} required />
                  </div>
                  <div className="field">
                    <label>Nueva contraseña</label>
                    <input name="password" type="password" minLength={8} placeholder="(dejar vacío = no cambiar)" />
                  </div>
                  <div className="field">
                    <label>Nombre</label>
                    <input name="nombre" defaultValue={user.nombre} minLength={2} maxLength={80} required />
                  </div>
                  <div className="field">
                    <label>Apellido</label>
                    <input name="apellido" defaultValue={user.apellido} minLength={2} maxLength={80} required />
                  </div>
                  <div className="field">
                    <label>Rol</label>
                    <select name="rol" defaultValue={user.rol} required>
                      <option value="ESTUDIANTE">Estudiante</option>
                      <option value="PROFESOR">Profesor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Estado</label>
                    <select name="activo" defaultValue={String(user.activo)} required>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>
                    Guardar cambios
                  </button>
                  {user.id !== session.user.id && user.activo && (
                    <span /> // placeholder para alinear el botón de desactivar en el form de abajo
                  )}
                </div>
              </form>

              {user.id !== session.user.id && user.activo && (
                <form action={deactivateUser} style={{ marginTop: 8 }}>
                  <input name="userId" type="hidden" value={user.id} />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ fontSize: 13, color: "var(--desaprobado-texto)", borderColor: "var(--desaprobado-texto)" }}
                  >
                    Desactivar cuenta
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
