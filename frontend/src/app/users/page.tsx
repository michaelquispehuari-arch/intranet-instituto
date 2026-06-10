import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { SearchForm } from "@/components/search-form";
import { authOptions } from "@/lib/auth";
import { backendDelete, backendGet, backendPatch, backendPost } from "@/lib/backend";

type UsersPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
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

async function createUser(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  await backendPost("/api/users", session, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    nombre: String(formData.get("nombre") ?? ""),
    apellido: String(formData.get("apellido") ?? ""),
    rol: String(formData.get("rol") ?? "ESTUDIANTE"),
  });

  redirect("/users");
}

async function updateUser(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

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

  redirect("/users");
}

async function deactivateUser(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const userId = String(formData.get("userId") ?? "");
  await backendDelete(`/api/users/${userId}`, session);
  redirect("/users");
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.rol !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await backendGet<{ users: UserItem[] }>("/api/users", session);
  const query = ((await searchParams)?.q ?? "").trim().toLowerCase();
  const users = query
    ? data.users.filter((user) =>
        [user.nombre, user.apellido, user.email, user.rol, user.activo ? "activo" : "inactivo"]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : data.users;

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Usuarios</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">ADMIN</span>
          <h1>Gestion de cuentas</h1>
          <p className="muted">Altas, roles y estado de acceso de los usuarios.</p>
        </section>

        <SearchForm value={query} placeholder="Nombre, email, rol o estado" />

        <form className="panel form wide-form" action={createUser}>
          <h2 className="section-title">Nuevo usuario</h2>
          <div className="form-grid">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label className="field">
              <span>Contrasena inicial</span>
              <input name="password" type="password" minLength={8} required />
            </label>
            <label className="field">
              <span>Nombre</span>
              <input name="nombre" minLength={2} maxLength={80} required />
            </label>
            <label className="field">
              <span>Apellido</span>
              <input name="apellido" minLength={2} maxLength={80} required />
            </label>
            <label className="field">
              <span>Rol</span>
              <select name="rol" defaultValue="ESTUDIANTE" required>
                <option value="ESTUDIANTE">Estudiante</option>
                <option value="PROFESOR">Profesor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
          </div>
          <div className="card-actions">
            <button className="button" type="submit">
              Crear usuario
            </button>
          </div>
        </form>

        <section className="stack" aria-label="Usuarios registrados">
          {users.map((user) => (
            <article className="panel result-card" key={user.id}>
              <div className="result-header">
                <div>
                  <span className="badge">{user.activo ? user.rol : "INACTIVO"}</span>
                  <h2>
                    {user.nombre} {user.apellido}
                  </h2>
                  <p className="muted">{user.email}</p>
                </div>
                <dl className="mini-stats">
                  <div>
                    <dt>Cursos</dt>
                    <dd>{user._count.cursosComoProfesor}</dd>
                  </div>
                  <div>
                    <dt>Inscripciones</dt>
                    <dd>{user._count.inscripciones}</dd>
                  </div>
                  <div>
                    <dt>Envios</dt>
                    <dd>{user._count.examenesSub}</dd>
                  </div>
                </dl>
              </div>

              <form className="form inline-edit-form" action={updateUser}>
                <input name="userId" type="hidden" value={user.id} />
                <div className="form-grid">
                  <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" defaultValue={user.email} required />
                  </label>
                  <label className="field">
                    <span>Nueva contrasena</span>
                    <input name="password" type="password" minLength={8} />
                  </label>
                  <label className="field">
                    <span>Nombre</span>
                    <input name="nombre" defaultValue={user.nombre} minLength={2} maxLength={80} required />
                  </label>
                  <label className="field">
                    <span>Apellido</span>
                    <input name="apellido" defaultValue={user.apellido} minLength={2} maxLength={80} required />
                  </label>
                  <label className="field">
                    <span>Rol</span>
                    <select name="rol" defaultValue={user.rol} required>
                      <option value="ESTUDIANTE">Estudiante</option>
                      <option value="PROFESOR">Profesor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Estado</span>
                    <select name="activo" defaultValue={String(user.activo)} required>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </label>
                </div>

                <div className="card-actions">
                  <button className="button" type="submit">
                    Guardar cambios
                  </button>
                </div>
              </form>

              {user.id !== session.user.id && user.activo ? (
                <form action={deactivateUser}>
                  <input name="userId" type="hidden" value={user.id} />
                  <button className="button secondary danger-button" type="submit">
                    Desactivar cuenta
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
