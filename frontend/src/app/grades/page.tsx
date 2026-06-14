import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet, backendPost } from "@/lib/backend";
import { LogoutButton } from "../dashboard/logout-button";

type GradeSummary = {
  curso: {
    id: string;
    nombre: string;
    ciclo: number;
    anio: number;
  };
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  notaAsistencia: number | null;
  promedioAcademico: number | null;
  promedioFinal: number | null;
  aprobado: boolean | null;
  notaAprobatoria: number;
};

type CourseListItem = {
  id: string;
  nombre: string;
  ciclo: number;
  anio: number;
};

type CourseDetail = CourseListItem & {
  inscripciones: Array<{
    estudiante: {
      id: string;
      nombre: string;
      apellido: string;
      email: string;
    };
  }>;
};

function formatGrade(value: number | null) {
  return value === null ? "Sin nota" : value.toFixed(2);
}

async function createManualGrade(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "PROFESOR") {
    redirect("/login");
  }

  await backendPost("/api/grades/manual", session, {
    estudianteId: parseTarget(formData).estudianteId,
    cursoId: parseTarget(formData).cursoId,
    valor: Number(formData.get("valor") ?? 0),
    descripcion: String(formData.get("descripcion") ?? "") || undefined,
    fecha: String(formData.get("fecha") ?? "") || undefined,
  });

  redirect("/grades");
}

async function setAttendanceGrade(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  await backendPost("/api/grades/attendance", session, {
    estudianteId: parseTarget(formData).estudianteId,
    cursoId: parseTarget(formData).cursoId,
    notaAsistencia: Number(formData.get("notaAsistencia") ?? 0),
  });

  redirect("/grades");
}

function parseTarget(formData: FormData) {
  const [cursoId = "", estudianteId = ""] = String(formData.get("target") ?? "").split("|");
  return { cursoId, estudianteId };
}

export default async function GradesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const data = await backendGet<{ summaries: GradeSummary[] }>("/api/grades", session);
  let courseDetails: CourseDetail[] = [];

  if (session.user.rol === "ADMIN" || session.user.rol === "PROFESOR") {
    const { courses } = await backendGet<{ courses: CourseListItem[] }>("/api/courses", session);
    courseDetails = await Promise.all(
      courses.map(async (course) => {
        const detail = await backendGet<{ course: CourseDetail }>(`/api/courses/${course.id}`, session);
        return detail.course;
      }),
    );
  }

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Calificaciones</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>Registro academico</h1>
          <p className="muted">Promedios calculados por el backend segun la configuracion del curso.</p>
        </section>

        {session.user.rol === "PROFESOR" ? (
          <section className="grid two-column-grid" aria-label="Acciones de profesor">
            <form className="panel form wide-form" action={createManualGrade}>
              <h2 className="section-title">Nota manual</h2>
              <GradeStudentFields courses={courseDetails} />
              <div className="form-grid compact">
                <label className="field">
                  <span>Nota</span>
                  <input name="valor" type="number" min={0} max={20} step={0.1} required />
                </label>
                <label className="field">
                  <span>Fecha</span>
                  <input name="fecha" type="date" />
                </label>
              </div>
              <label className="field">
                <span>Descripcion</span>
                <input name="descripcion" maxLength={300} />
              </label>
              <button className="button" type="submit" disabled={courseDetails.length === 0}>
                Registrar nota
              </button>
            </form>
          </section>
        ) : null}

        {session.user.rol === "ADMIN" ? (
          <section className="grid two-column-grid" aria-label="Acciones de admin">
            <form className="panel form wide-form" action={setAttendanceGrade}>
              <h2 className="section-title">Nota de asistencia</h2>
              <GradeStudentFields courses={courseDetails} />
              <label className="field">
                <span>Nota 0 a 20</span>
                <input name="notaAsistencia" type="number" min={0} max={20} step={0.1} required />
              </label>
              <button className="button" type="submit" disabled={courseDetails.length === 0}>
                Guardar asistencia
              </button>
            </form>
          </section>
        ) : null}

        {data.summaries.length === 0 ? (
          <section className="panel empty-state">
            <strong>No hay calificaciones disponibles.</strong>
            <p className="muted">Cuando existan estudiantes inscritos o notas, apareceran aqui.</p>
          </section>
        ) : (
          <section className="grid" aria-label="Resumen de calificaciones">
            {data.summaries.map((summary) => (
              <article className="panel module-card" key={`${summary.curso.id}-${summary.estudiante.id}`}>
                <div>
                  <span className="badge">
                    {summary.curso.ciclo}-{summary.curso.anio}
                  </span>
                  <h2>{summary.curso.nombre}</h2>
                  <p>
                    {summary.estudiante.nombre} {summary.estudiante.apellido}
                  </p>
                  <p>Asistencia: {formatGrade(summary.notaAsistencia)}</p>
                  <p>Academico: {formatGrade(summary.promedioAcademico)}</p>
                  <p>Aprobatoria: {summary.notaAprobatoria.toFixed(1)}</p>
                </div>
                <strong>
                  Final: {formatGrade(summary.promedioFinal)}{" "}
                  {summary.aprobado === null ? "" : summary.aprobado ? "Aprobado" : "En riesgo"}
                </strong>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function GradeStudentFields({ courses }: { courses: CourseDetail[] }) {
  const students = courses.flatMap((course) =>
    course.inscripciones.map((inscripcion) => ({
      cursoId: course.id,
      cursoNombre: course.nombre,
      estudiante: inscripcion.estudiante,
    })),
  );

  return (
    <div className="form-grid">
      <label className="field">
        <span>Curso y estudiante</span>
        <select name="target" required>
          <option value="">Selecciona curso y estudiante</option>
          {students.map(({ cursoId, cursoNombre, estudiante }) => (
            <option key={`${cursoId}-${estudiante.id}`} value={`${cursoId}|${estudiante.id}`}>
              {estudiante.nombre} {estudiante.apellido} - {cursoNombre}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
