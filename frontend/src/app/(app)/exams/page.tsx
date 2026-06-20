import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet, backendPatch } from "@/lib/backend";
import type { ExamListItem } from "./types";

function formatDate(value: string | null) {
  if (!value) {
    return "Sin publicar";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getExamAvailabilityLabel(exam: ExamListItem) {
  const now = new Date();

  if (!exam.publicadoEn) return "Borrador";
  if (exam.disponibleDesde && new Date(exam.disponibleDesde) > now) return `Disponible desde ${formatDate(exam.disponibleDesde)}`;
  if (exam.disponibleHasta && new Date(exam.disponibleHasta) < now) return "Vencido";
  return "Disponible";
}

function canOpenExam(exam: ExamListItem, role: string) {
  if (role !== "ESTUDIANTE") return true;
  return getExamAvailabilityLabel(exam) === "Disponible";
}

async function publishExam(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || !["ADMIN", "PROFESOR"].includes(session.user.rol)) {
    redirect("/login");
  }

  const examId = String(formData.get("examId") ?? "");
  await backendPatch(`/api/exams/${examId}/publish`, session, {});
  redirect("/exams");
}

export default async function ExamsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let data: { exams: ExamListItem[] };
  try {
    data = await backendGet<{ exams: ExamListItem[] }>("/api/exams", session);
  } catch (err) {
    if (err instanceof BackendRequestError && err.statusCode === 401) redirect("/login");
    return (
      <div className="card">
        <div className="empty-state">
          <p className="empty-state-title">Error al cargar exámenes</p>
          <p style={{ color: "var(--texto-tenue)" }}>{err instanceof Error ? err.message : "Error del servidor"}</p>
        </div>
      </div>
    );
  }
  const canManageExams = session.user.rol === "PROFESOR" || session.user.rol === "ADMIN";

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="page-eyebrow">{session.user.rol}</span>
          <h1 className="page-title">Examenes</h1>
          <p className="page-subtitle">
            {canManageExams
              ? "Crea, publica y revisa evaluaciones de tus cursos."
              : "Rinde las evaluaciones publicadas de tus cursos."}
          </p>
        </div>
        {canManageExams ? (
          <Link className="btn btn-primary" href="/exams/create">
            Nuevo examen
          </Link>
        ) : null}
      </div>

      {data.exams.length === 0 ? (
        <section className="card empty-state">
          <strong>No hay examenes disponibles.</strong>
          <p className="muted">Cuando exista una evaluacion para tu rol, aparecera aqui.</p>
        </section>
      ) : (
        <section className="stat-grid" aria-label="Examenes disponibles">
          {data.exams.map((exam) => (
            <article className="card exam-card" style={{ padding: 20 }} key={exam.id}>
              <div>
                <span className="badge">{getExamAvailabilityLabel(exam)}</span>
                <h2 style={{ margin: "8px 0 4px", fontSize: 17 }}>{exam.titulo}</h2>
                <p style={{ color: "var(--texto-secundario)", fontSize: 14 }}>{exam.descripcion ?? "Sin descripcion"}</p>
                <dl className="meta-list">
                  <div>
                    <dt>Curso</dt>
                    <dd>{exam.curso.nombre}</dd>
                  </div>
                  <div>
                    <dt>Duracion</dt>
                    <dd>{exam.duracionMinutos} min</dd>
                  </div>
                  <div>
                    <dt>Preguntas</dt>
                    <dd>{exam._count.preguntas}</dd>
                  </div>
                  <div>
                    <dt>Publicado</dt>
                    <dd>{formatDate(exam.publicadoEn)}</dd>
                  </div>
                </dl>
              </div>

              <div className="card-actions">
                {canOpenExam(exam, session.user.rol) ? (
                  <Link className="btn btn-secondary" href={`/exams/${exam.id}`}>
                    {session.user.rol === "ESTUDIANTE" ? "Dar examen" : "Abrir"}
                  </Link>
                ) : (
                  <span className="btn btn-secondary" aria-disabled="true">
                    No disponible
                  </span>
                )}
                {exam._count.envios > 0 || session.user.rol !== "ESTUDIANTE" ? (
                  <Link className="btn btn-secondary" href={`/exams/${exam.id}/results`}>
                    Resultados
                  </Link>
                ) : null}
                {canManageExams && !exam.publicadoEn ? (
                  <form action={publishExam}>
                    <input name="examId" type="hidden" value={exam.id} />
                    <button className="btn btn-primary" type="submit">
                      Publicar
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
