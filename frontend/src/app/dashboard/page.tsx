import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

const modulesByRole = {
  ADMIN: [
    { title: "Usuarios", href: "/users", description: "Gestion de cuentas y roles." },
    { title: "Cursos", href: "/courses", description: "Gestion de cursos y profesores." },
    { title: "Calificaciones", href: "/grades", description: "Revision general y configuracion academica." },
    { title: "Configuracion", href: "/settings", description: "Parametros del sistema." },
  ],
  PROFESOR: [
    { title: "Cursos", href: "/courses", description: "Cursos asignados y estudiantes." },
    { title: "Materiales", href: "/content", description: "Biblioteca de archivos por curso." },
    { title: "Examenes", href: "/exams", description: "Crear, publicar y revisar examenes." },
    { title: "Calificaciones", href: "/grades", description: "Notas manuales, promedios y asistencia." },
  ],
  ESTUDIANTE: [
    { title: "Cursos", href: "/courses", description: "Cursos donde estas inscrito." },
    { title: "Examenes", href: "/exams", description: "Evaluaciones publicadas de tus cursos." },
    { title: "Materiales", href: "/content", description: "Biblioteca de archivos disponibles." },
    { title: "Mis notas", href: "/grades", description: "Promedios, notas y asistencia." },
  ],
} as const;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const modules = modulesByRole[session.user.rol];

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Intranet Instituto</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>
            {session.user.nombre} {session.user.apellido}
          </h1>
          <p className="muted">Selecciona el modulo que necesitas revisar.</p>
        </section>

        <section className="grid" aria-label="Modulos disponibles">
          {modules.map((module) => (
            <a className="panel module-card" href={module.href} key={module.href}>
              <div>
                <h2>{module.title}</h2>
                <p>{module.description}</p>
              </div>
              <span className="muted">Abrir</span>
            </a>
          ))}
        </section>
      </div>
    </main>
  );
}
