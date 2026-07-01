import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, BarChart3, Users, GraduationCap, RefreshCw,
  Settings, FileText, Video, ArrowRight, CalendarDays,
  FolderOpen, CheckCircle2,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import { SectionHead } from "@/components/ui/SectionHead";
import { EmptyState } from "@/components/ui/EmptyState";

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

/* ── Admin quick-access items ── */
const adminItems = [
  { href: "/cursos",         label: "Cursos",        desc: "Gestionar cursos y sesiones",    Icon: BookOpen },
  { href: "/calificaciones", label: "Calificaciones", desc: "Cronograma de notas por alumno", Icon: BarChart3 },
  { href: "/exams",          label: "Exámenes",      desc: "Crear y revisar exámenes",       Icon: FileText },
  { href: "/estudiantes",    label: "Estudiantes",   desc: "Registro y cuentas de alumnos",  Icon: Users },
  { href: "/profesores",     label: "Profesores",    desc: "Registro y cuentas docentes",    Icon: GraduationCap },
  { href: "/sustitutorios",  label: "Sustitutorios", desc: "Alumnos elegibles",              Icon: RefreshCw },
  { href: "/configuracion",  label: "Configuración", desc: "Zoom y ajustes globales",        Icon: Settings },
] as const;

export default async function InicioPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const rol = session.user.rol;

  const [cursos, zoom] = await Promise.all([
    fetchSafe(() => backendGet<CoursesResponse>("/api/courses", session)),
    fetchSafe(() => backendGet<ZoomConfig>("/api/config/zoom", session)),
  ]);

  const todosLosCursos = cursos?.courses ?? [];
  const cursosActivos  = todosLosCursos.filter((c) => c.activo);
  const enlaceZoom     = zoom?.enlaceZoom ?? null;

  /* ════════════════════════════════════════════════════
     ADMIN
  ════════════════════════════════════════════════════ */
  if (rol === "ADMIN") {
    return (
      <div>
        <SectionHead
          eyebrow="Administración"
          title={`Hola, ${session.user.nombre}`}
          description="Panel de control del ciclo académico."
        />

        {/* Stat cards */}
        <div className="stat-grid stagger" style={{ marginBottom: "var(--s-8)" }}>
          <div className="stat-card">
            <div className="stat-card-label">Cursos activos</div>
            <div className="stat-card-value">{cursosActivos.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Cursos totales</div>
            <div className="stat-card-value">{todosLosCursos.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Zoom</div>
            <div className="stat-card-value stat-card-zoom">
              {enlaceZoom
                ? <><CheckCircle2 size={18} aria-hidden /> Configurado</>
                : <span style={{ color: "var(--ink-mute)", fontSize: "1rem" }}>Sin configurar</span>
              }
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <h2 className="h3" style={{ margin: "0 0 var(--s-4)" }}>Accesos rápidos</h2>
        <div className="qa-grid stagger">
          {adminItems.map(({ href, label, desc, Icon }) => (
            <Link key={href} href={href} className="card card--link qa-card">
              <span className="qa-icon" aria-hidden="true"><Icon /></span>
              <span className="qa-body">
                <span className="qa-title">{label}</span>
                <span className="qa-desc">{desc}</span>
              </span>
              <span className="qa-arrow" aria-hidden="true"><ArrowRight /></span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     PROFESOR
  ════════════════════════════════════════════════════ */
  if (rol === "PROFESOR") {
    const miCurso = cursosActivos[0] ?? null;
    return (
      <div>
        <SectionHead
          eyebrow="Docente"
          title={`Hola, ${session.user.nombre}`}
          description="Tu clase de esta semana."
        />

        {enlaceZoom && (
          <a
            href={enlaceZoom}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--accent"
            style={{ marginBottom: "var(--s-6)", display: "inline-flex" }}
          >
            <Video size={18} aria-hidden /> Unirse a la clase ahora
          </a>
        )}

        {miCurso ? (
          <>
            <Link href={`/cursos/${miCurso.id}`} className="card card--link" style={{ display: "block", marginBottom: "var(--s-4)" }}>
              <span className="chip chip--ok" style={{ marginBottom: "var(--s-3)", display: "inline-flex" }}>
                <CheckCircle2 size={13} aria-hidden /> Curso activo
              </span>
              <h2 className="h2" style={{ margin: "0 0 var(--s-2)" }}>{miCurso.nombre}</h2>
              <p className="small" style={{ margin: "0 0 var(--s-3)" }}>
                {miCurso.descripcion ?? "Ver sesiones, material y exámenes del curso."}
              </p>
              <span className="small">
                Prof. {miCurso.profesor.nombre} {miCurso.profesor.apellido}
              </span>
            </Link>

            {cursosActivos.length > 1 && (
              <Link href="/cursos" className="btn btn--ghost btn--sm" style={{ display: "inline-flex", marginBottom: "var(--s-6)" }}>
                Ver mis cursos ({cursosActivos.length}) <ArrowRight size={16} aria-hidden />
              </Link>
            )}
          </>
        ) : (
          <div className="card" style={{ marginBottom: "var(--s-6)" }}>
            <EmptyState
              icon={<CalendarDays size={32} />}
              title="Aún no tienes un curso asignado."
              description="El administrador asignará tu curso próximamente."
            />
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     ESTUDIANTE
  ════════════════════════════════════════════════════ */
  const miCurso = cursosActivos[0] ?? null;

  const estudianteItems = miCurso ? [
    { href: `/cursos/${miCurso.id}`, label: "Ver sesiones",   desc: "Sesiones del ciclo",   Icon: CalendarDays },
    { href: "/exams",                label: "Mis exámenes",   desc: "Exámenes disponibles", Icon: FileText },
    { href: "/material",             label: "Material",       desc: "Archivos y recursos",  Icon: FolderOpen },
    { href: "/calificaciones",       label: "Mis notas",      desc: "Historial de notas",   Icon: BarChart3 },
  ] : [];

  return (
    <div>
      <SectionHead
        eyebrow="Estudiante"
        title={`Hola, ${session.user.nombre}`}
        description="Tu curso activo esta semana."
      />

      {enlaceZoom && (
        <a
          href={enlaceZoom}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--accent"
          style={{ marginBottom: "var(--s-6)", display: "inline-flex" }}
        >
          <Video size={18} aria-hidden /> Unirse a la clase ahora
        </a>
      )}

      {miCurso ? (
        <>
          <Link href={`/cursos/${miCurso.id}`} className="card card--link" style={{ display: "block", marginBottom: "var(--s-6)" }}>
            <span className="chip chip--ok" style={{ marginBottom: "var(--s-3)", display: "inline-flex" }}>
              <CheckCircle2 size={13} aria-hidden /> Curso activo
            </span>
            <h2 className="h2" style={{ margin: "0 0 var(--s-2)" }}>{miCurso.nombre}</h2>
            <p className="small" style={{ margin: "0 0 var(--s-3)" }}>
              {miCurso.descripcion ?? "—"}
            </p>
            <span className="small">
              Prof. {miCurso.profesor.nombre} {miCurso.profesor.apellido}
            </span>
          </Link>

          <h2 className="h3" style={{ margin: "0 0 var(--s-4)" }}>Accesos rápidos</h2>
          <div className="qa-grid stagger">
            {estudianteItems.map(({ href, label, desc, Icon }) => (
              <Link key={href} href={href} className="card card--link qa-card">
                <span className="qa-icon" aria-hidden="true"><Icon /></span>
                <span className="qa-body">
                  <span className="qa-title">{label}</span>
                  <span className="qa-desc">{desc}</span>
                </span>
                <span className="qa-arrow" aria-hidden="true"><ArrowRight /></span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={32} />}
            title="Aún no tienes un curso inscrito."
            description="El administrador te inscribirá en un curso próximamente."
          />
        </div>
      )}
    </div>
  );
}
