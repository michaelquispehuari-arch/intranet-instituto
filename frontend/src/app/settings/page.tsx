import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { authOptions } from "@/lib/auth";
import { backendGet, backendPatch } from "@/lib/backend";
import { env } from "@/lib/env";

type CourseItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  ciclo: number;
  anio: number;
  activo: boolean;
  profesor: {
    nombre: string;
    apellido: string;
    email: string;
  };
  _count: {
    inscripciones: number;
    examenes: number;
    materiales: number;
  };
};

type GradeConfig = {
  id?: string;
  cursoId: string;
  pesoAsistencia: number;
  pesoAcademico: number;
  notaAprobatoria: number;
};

type ServiceStatus = {
  status: "ok" | "missing" | "error";
  message?: string;
};

type ReadinessStatus = {
  status: "ready" | "degraded";
  services: Record<string, ServiceStatus>;
};

async function getReadinessStatus(): Promise<ReadinessStatus | null> {
  try {
    const response = await fetch(`${env.BACKEND_URL}/health/ready`, {
      cache: "no-store",
    });

    return (await response.json()) as ReadinessStatus;
  } catch {
    return null;
  }
}

async function updateGradeConfig(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const cursoId = String(formData.get("cursoId") ?? "");
  await backendPatch(`/api/grades/config/${cursoId}`, session, {
    pesoAsistencia: Number(formData.get("pesoAsistencia") ?? 0),
    pesoAcademico: Number(formData.get("pesoAcademico") ?? 0),
    notaAprobatoria: Number(formData.get("notaAprobatoria") ?? 0),
  });

  redirect("/settings");
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.rol !== "ADMIN") {
    redirect("/dashboard");
  }

  const { courses } = await backendGet<{ courses: CourseItem[] }>("/api/courses", session);
  const readiness = await getReadinessStatus();
  const configs = await Promise.all(
    courses.map(async (course) => {
      const data = await backendGet<{ config: GradeConfig }>(`/api/grades/config/${course.id}`, session);
      return data.config;
    }),
  );
  const configsByCourse = new Map(configs.map((config) => [config.cursoId, config]));

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Configuracion</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">ADMIN</span>
          <h1>Parametros academicos</h1>
          <p className="muted">Pesos de calificacion y nota aprobatoria por curso.</p>
        </section>

        <section className="panel result-card" aria-label="Estado de servicios">
          <div className="result-header">
            <div>
              <span className="badge">Produccion</span>
              <h2>Estado de servicios</h2>
              <p className="muted">Diagnostico real de backend y servicios externos.</p>
            </div>
            <span className={`status-pill ${readiness?.status === "ready" ? "ok" : "warning"}`}>
              {readiness?.status === "ready" ? "Listo" : "Pendiente"}
            </span>
          </div>

          {readiness ? (
            <dl className="service-list">
              {Object.entries(readiness.services).map(([name, service]) => (
                <div key={name}>
                  <dt>{name.toUpperCase()}</dt>
                  <dd>
                    <span className={`status-pill ${service.status}`}>
                      {service.status}
                    </span>
                    {service.message ? <small>{service.message}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="error">No se pudo consultar /health/ready del backend.</p>
          )}
        </section>

        {courses.length === 0 ? (
          <section className="panel empty-state">
            <strong>No hay cursos registrados.</strong>
            <p className="muted">Crea cursos antes de configurar sus calificaciones.</p>
          </section>
        ) : (
          <section className="stack" aria-label="Configuracion por curso">
            {courses.map((course) => {
              const config = configsByCourse.get(course.id);

              return (
                <article className="panel result-card" key={course.id}>
                  <div className="result-header">
                    <div>
                      <span className="badge">
                        Ciclo {course.ciclo} · {course.anio}
                      </span>
                      <h2>{course.nombre}</h2>
                      <p className="muted">
                        {course.profesor.nombre} {course.profesor.apellido} ·{" "}
                        {course._count.inscripciones} estudiantes
                      </p>
                    </div>
                    <span className="badge">{course.activo ? "Activo" : "Inactivo"}</span>
                  </div>

                  <form className="form inline-edit-form" action={updateGradeConfig}>
                    <input name="cursoId" type="hidden" value={course.id} />
                    <div className="form-grid compact">
                      <label className="field">
                        <span>Peso asistencia</span>
                        <input
                          name="pesoAsistencia"
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={config?.pesoAsistencia ?? 0.5}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Peso academico</span>
                        <input
                          name="pesoAcademico"
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={config?.pesoAcademico ?? 0.5}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Nota aprobatoria</span>
                        <input
                          name="notaAprobatoria"
                          type="number"
                          min={0}
                          max={20}
                          step={0.1}
                          defaultValue={config?.notaAprobatoria ?? 11}
                          required
                        />
                      </label>
                    </div>
                    <div className="card-actions">
                      <button className="button" type="submit">
                        Guardar configuracion
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
