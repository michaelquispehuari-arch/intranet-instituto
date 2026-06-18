import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { SearchForm } from "@/components/search-form";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendDelete, backendGet, backendPatch, backendPost } from "@/lib/backend";

type CoursesPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

type CourseItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  ciclo: number;
  anio: number;
  profesorId: string;
  activo: boolean;
  profesor: {
    id: string;
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

type CourseDetail = CourseItem & {
  inscripciones: Array<{
    estudiante: {
      id: string;
      nombre: string;
      apellido: string;
      email: string;
    };
  }>;
};

type UserItem = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  activo: boolean;
};

async function createCourse(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  await backendPost("/api/courses", session, {
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? "") || undefined,
    ciclo: Number(formData.get("ciclo") ?? 1),
    anio: Number(formData.get("anio") ?? new Date().getFullYear()),
    profesorId: String(formData.get("profesorId") ?? ""),
  });

  redirect("/courses");
}

async function updateCourse(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const courseId = String(formData.get("courseId") ?? "");

  await backendPatch(`/api/courses/${courseId}`, session, {
    nombre: String(formData.get("nombre") ?? ""),
    descripcion: String(formData.get("descripcion") ?? "") || undefined,
    ciclo: Number(formData.get("ciclo") ?? 1),
    anio: Number(formData.get("anio") ?? new Date().getFullYear()),
    profesorId: String(formData.get("profesorId") ?? ""),
    activo: String(formData.get("activo") ?? "true") === "true",
  });

  redirect("/courses");
}

async function deactivateCourse(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const courseId = String(formData.get("courseId") ?? "");
  await backendDelete(`/api/courses/${courseId}`, session);
  redirect("/courses");
}

async function enrollStudent(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const courseId = String(formData.get("courseId") ?? "");
  await backendPost(`/api/courses/${courseId}/enrollments`, session, {
    estudianteId: String(formData.get("estudianteId") ?? ""),
  });
  redirect("/courses");
}

async function unenrollStudent(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || session.user.rol !== "ADMIN") {
    redirect("/login");
  }

  const courseId = String(formData.get("courseId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  await backendDelete(`/api/courses/${courseId}/enrollments/${studentId}`, session);
  redirect("/courses");
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let courses: CourseItem[];
  try {
    const result = await backendGet<{ courses: CourseItem[] }>("/api/courses", session);
    courses = result.courses;
  } catch (err) {
    if (err instanceof BackendRequestError && err.statusCode === 401) redirect("/login");
    return (
      <main className="page">
        <div className="shell dashboard">
          <div className="card">
            <div className="empty-state">
              <p className="empty-state-title">Error al cargar cursos</p>
              <p>{err instanceof Error ? err.message : "Error del servidor"}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const query = ((await searchParams)?.q ?? "").trim().toLowerCase();
  const filteredCourses = query
    ? courses.filter((course) =>
        [
          course.nombre,
          course.descripcion ?? "",
          course.profesor.nombre,
          course.profesor.apellido,
          course.profesor.email,
          course.activo ? "activo" : "inactivo",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : courses;
  let professors: UserItem[] = [];
  let students: UserItem[] = [];
  let courseDetails = new Map<string, CourseDetail>();

  if (session.user.rol === "ADMIN") {
    try {
      const usersData = await backendGet<{ users: UserItem[] }>("/api/users", session);
      professors = usersData.users.filter((user) => user.rol === "PROFESOR" && user.activo);
      students = usersData.users.filter((user) => user.rol === "ESTUDIANTE" && user.activo);
    } catch {
      // Si falla la lista de usuarios, seguimos sin los selectores de profesor/estudiante
    }
  }

  if (session.user.rol !== "ESTUDIANTE") {
    try {
      const details = await Promise.all(
        filteredCourses.map(async (course) => {
          const data = await backendGet<{ course: CourseDetail }>(`/api/courses/${course.id}`, session);
          return data.course;
        }),
      );
      courseDetails = new Map(details.map((course) => [course.id, course]));
    } catch {
      // Si falla el detalle de cursos, se muestra la lista sin inscripciones
    }
  }

  return (
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>Cursos</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <LogoutButton />
        </header>

        <section className="panel hero">
          <span className="badge">{session.user.rol}</span>
          <h1>Cursos academicos</h1>
          <p className="muted">Cursos visibles segun tu rol y asignaciones.</p>
        </section>

        <SearchForm value={query} placeholder="Curso, profesor o estado" />

        {session.user.rol === "ADMIN" ? (
          <form className="panel form wide-form" action={createCourse}>
            <h2 className="section-title">Nuevo curso</h2>
            <CourseFields professors={professors} />
            <div className="card-actions">
              <button className="button" type="submit" disabled={professors.length === 0}>
                Crear curso
              </button>
            </div>
          </form>
        ) : null}

        {filteredCourses.length === 0 ? (
          <section className="panel empty-state">
            <strong>No hay cursos disponibles.</strong>
            <p className="muted">Los cursos activos apareceran aqui segun tus permisos.</p>
          </section>
        ) : (
          <section className="stack" aria-label="Cursos disponibles">
            {filteredCourses.map((course) => {
              const detail = courseDetails.get(course.id);
              const enrolledStudentIds = new Set(
                detail?.inscripciones.map((inscripcion) => inscripcion.estudiante.id) ?? [],
              );
              const availableStudents = students.filter((student) => !enrolledStudentIds.has(student.id));

              return (
                <article className="panel result-card" key={course.id}>
                  <div className="result-header">
                    <div>
                      <span className="badge">
                        Ciclo {course.ciclo} - {course.anio}
                      </span>
                      <h2>{course.nombre}</h2>
                      <p className="muted">{course.descripcion ?? "Sin descripcion"}</p>
                      <p className="muted">
                        Profesor: {course.profesor.nombre} {course.profesor.apellido}
                      </p>
                    </div>
                    <dl className="mini-stats">
                      <div>
                        <dt>Estudiantes</dt>
                        <dd>{course._count.inscripciones}</dd>
                      </div>
                      <div>
                        <dt>Examenes</dt>
                        <dd>{course._count.examenes}</dd>
                      </div>
                      <div>
                        <dt>Materiales</dt>
                        <dd>{course._count.materiales}</dd>
                      </div>
                    </dl>
                  </div>

                  {detail ? (
                    <section className="enrollment-block" aria-label="Estudiantes inscritos">
                      <h3>Estudiantes inscritos</h3>
                      {detail.inscripciones.length ? (
                        <ul className="enrollment-list">
                          {detail.inscripciones.map((inscripcion) => (
                            <li key={inscripcion.estudiante.id}>
                              <span>
                                {inscripcion.estudiante.nombre} {inscripcion.estudiante.apellido}
                                <small>{inscripcion.estudiante.email}</small>
                              </span>
                              {session.user.rol === "ADMIN" ? (
                                <form action={unenrollStudent}>
                                  <input name="courseId" type="hidden" value={course.id} />
                                  <input name="studentId" type="hidden" value={inscripcion.estudiante.id} />
                                  <button className="button secondary danger-button" type="submit">
                                    Retirar
                                  </button>
                                </form>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">Sin estudiantes inscritos.</p>
                      )}
                    </section>
                  ) : null}

                  {session.user.rol === "ADMIN" ? (
                    <>
                      <form className="form inline-edit-form" action={enrollStudent}>
                        <input name="courseId" type="hidden" value={course.id} />
                        <div className="form-grid compact">
                          <label className="field">
                            <span>Matricular estudiante</span>
                            <select name="estudianteId" required>
                              <option value="">Selecciona estudiante</option>
                              {availableStudents.map((student) => (
                                <option key={student.id} value={student.id}>
                                  {student.nombre} {student.apellido} - {student.email}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button className="button secondary" type="submit" disabled={availableStudents.length === 0}>
                          Matricular
                        </button>
                      </form>

                      <form className="form inline-edit-form" action={updateCourse}>
                        <input name="courseId" type="hidden" value={course.id} />
                        <CourseFields course={course} professors={professors} />
                        <div className="form-grid compact">
                          <label className="field">
                            <span>Estado</span>
                            <select name="activo" defaultValue={String(course.activo)} required>
                              <option value="true">Activo</option>
                              <option value="false">Inactivo</option>
                            </select>
                          </label>
                        </div>
                        <button className="button" type="submit">
                          Guardar curso
                        </button>
                      </form>

                      {course.activo ? (
                        <form action={deactivateCourse}>
                          <input name="courseId" type="hidden" value={course.id} />
                          <button className="button secondary danger-button" type="submit">
                            Desactivar curso
                          </button>
                        </form>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function CourseFields({
  course,
  professors,
}: {
  course?: CourseItem;
  professors: UserItem[];
}) {
  return (
    <div className="form-grid">
      <label className="field">
        <span>Nombre</span>
        <input name="nombre" defaultValue={course?.nombre} minLength={3} maxLength={120} required />
      </label>
      <label className="field">
        <span>Profesor</span>
        <select name="profesorId" defaultValue={course?.profesorId ?? ""} required>
          <option value="">Selecciona profesor</option>
          {professors.map((professor) => (
            <option key={professor.id} value={professor.id}>
              {professor.nombre} {professor.apellido} - {professor.email}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Ciclo</span>
        <input name="ciclo" type="number" min={1} max={2} defaultValue={course?.ciclo ?? 1} required />
      </label>
      <label className="field">
        <span>Anio</span>
        <input name="anio" type="number" min={2026} max={2100} defaultValue={course?.anio ?? 2026} required />
      </label>
      <label className="field full-row">
        <span>Descripcion</span>
        <textarea name="descripcion" defaultValue={course?.descripcion ?? ""} maxLength={500} rows={3} />
      </label>
    </div>
  );
}
