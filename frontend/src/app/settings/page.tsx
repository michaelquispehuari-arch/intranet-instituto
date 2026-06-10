import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { authOptions } from "@/lib/auth";
import { backendGet, backendPatch } from "@/lib/backend";

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
  pesoExamenes: number;
  pesoNotasManuales: number;
  notaAprobatoria: number;
};

async function updateGradeConfig(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const cursoId = String(formData.get("cursoId") ?? "");
  await backendPatch(`/api/grades/config/${cursoId}`, session, {
    pesoExamenes: Number(formData.get("pesoExamenes") ?? 0),
    pesoNotasManuales: Number(formData.get("pesoNotasManuales") ?? 0),
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
                        <span>Peso examenes</span>
                        <input
                          name="pesoExamenes"
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={config?.pesoExamenes ?? 0.7}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Peso notas manuales</span>
                        <input
                          name="pesoNotasManuales"
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          defaultValue={config?.pesoNotasManuales ?? 0.3}
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
