import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import Link from "next/link";

type Curso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
  profesor: { nombre: string; apellido: string };
};

type ZoomConfig = { enlaceZoom?: string };
type CoursesResponse = { courses: Curso[] };

async function fetchSafe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export default async function InicioPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const rol = session.user.rol;

  const [cursos, zoom] = await Promise.all([
    fetchSafe(() => backendGet<CoursesResponse>("/api/courses", session)),
    fetchSafe(() => backendGet<ZoomConfig>("/api/config/zoom", session)),
  ]);

  const cursosActivos = (cursos?.courses ?? []).filter((c) => c.activo);
  const enlaceZoom = zoom?.enlaceZoom ?? null;

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (rol === "ADMIN") {
    return (
      <div>
        <div className="page-header">
          <span className="page-eyebrow">Administración</span>
          <h1 className="page-title">
            Hola, {session.user.nombre}
          </h1>
          <p className="page-subtitle">Panel de control del ciclo académico</p>
        </div>

        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-value">{cursosActivos.length}</div>
            <div className="stat-label">Cursos activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(cursos?.courses ?? []).length}</div>
            <div className="stat-label">Cursos totales</div>
          </div>
          {enlaceZoom && (
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 20 }}>🎥</div>
              <div className="stat-label">Zoom configurado</div>
            </div>
          )}
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Accesos rápidos</h2>
        <div className="stat-grid">
          {[
            { href: "/cursos", label: "Cursos", desc: "Gestionar cursos y sesiones", icon: "📚" },
            { href: "/calificaciones", label: "Calificaciones", desc: "Cronograma de notas por alumno", icon: "📊" },
            { href: "/users", label: "Usuarios", desc: "Profesores y alumnos", icon: "👥" },
            { href: "/sustitutorios", label: "Sustitutorios", desc: "Alumnos elegibles", icon: "🔄" },
            { href: "/configuracion", label: "Configuración", desc: "Zoom y ajustes globales", icon: "⚙️" },
            { href: "/exams", label: "Exámenes", desc: "Crear y revisar exámenes", icon: "📝" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card" style={{ padding: "16px 20px", cursor: "pointer" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "var(--texto-secundario)" }}>{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── PROFESOR ───────────────────────────────────────────────────────────────
  if (rol === "PROFESOR") {
    const miCurso = cursosActivos[0] ?? null;
    return (
      <div>
        <div className="page-header">
          <span className="page-eyebrow">Bienvenido</span>
          <h1 className="page-title">
            Hola, {session.user.nombre}
          </h1>
          <p className="page-subtitle">Tu clase de esta semana</p>
        </div>

        {enlaceZoom && (
          <a
            href={enlaceZoom}
            target="_blank"
            rel="noopener noreferrer"
            className="zoom-button"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 15 }}
          >
            🎥 Unirse a Zoom ahora
          </a>
        )}

        {miCurso ? (
          <Link href={`/cursos/${miCurso.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ padding: 24, cursor: "pointer" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ambar-accion)", marginBottom: 6 }}>
                {miCurso.tipo}
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600 }}>{miCurso.nombre}</h2>
              <p style={{ margin: 0, color: "var(--texto-secundario)", fontSize: 14 }}>
                {miCurso.descripcion ?? "Ver sesiones, material y exámenes del curso →"}
              </p>
            </div>
          </Link>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p className="empty-state-title">Sin curso asignado esta semana</p>
              <p>El administrador asignará tu curso próximamente.</p>
            </div>
          </div>
        )}

        {cursosActivos.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <Link href="/cursos" style={{ color: "var(--ambar-accion)", fontWeight: 600, fontSize: 14 }}>
              Ver todos mis cursos ({cursosActivos.length}) →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── ESTUDIANTE ─────────────────────────────────────────────────────────────
  const miCurso = cursosActivos[0] ?? null;
  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">Bienvenido</span>
        <h1 className="page-title">
          Hola, {session.user.nombre}
        </h1>
        <p className="page-subtitle">Tu curso activo esta semana</p>
      </div>

      {enlaceZoom && (
        <a
          href={enlaceZoom}
          target="_blank"
          rel="noopener noreferrer"
          className="zoom-button"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 16 }}
        >
          🎥 Unirse a la clase por Zoom
        </a>
      )}

      {miCurso ? (
        <div style={{ display: "grid", gap: 16 }}>
          <Link href={`/cursos/${miCurso.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card" style={{ padding: 24, cursor: "pointer" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ambar-accion)", marginBottom: 6 }}>
                Curso activo
              </div>
              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600 }}>{miCurso.nombre}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--texto-secundario)" }}>
                {miCurso.descripcion ?? "—"}
              </p>
              <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                Prof. {miCurso.profesor.nombre} {miCurso.profesor.apellido}
              </div>
            </div>
          </Link>

          <div className="stat-grid">
            {[
              { href: `/cursos/${miCurso.id}`, label: "Ver sesiones", icon: "📅" },
              { href: `/exams`, label: "Mis exámenes", icon: "📝" },
              { href: `/content`, label: "Material", icon: "📁" },
              { href: "/calificaciones", label: "Mis notas", icon: "📊" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="card" style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p className="empty-state-title">Sin curso inscrito</p>
            <p>El administrador te inscribirá en un curso próximamente.</p>
          </div>
        </div>
      )}
    </div>
  );
}
