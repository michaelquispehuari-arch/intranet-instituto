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
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function getExamAvailabilityLabel(exam: ExamListItem) {
  const now = new Date();

  if (!exam.publicadoEn) return "Borrador";
  if (exam.disponibleDesde && new Date(exam.disponibleDesde) > now) return `Disponible desde ${formatDate(exam.disponibleDesde)}`;
  if (exam.disponibleDesde) {
    const cierre = new Date(new Date(exam.disponibleDesde).getTime() + exam.duracionMinutos * 60_000);
    if (cierre < now) return "Vencido";
  }
  return "Disponible";
}

function canOpenExam(exam: ExamListItem, role: string) {
  if (role !== "ESTUDIANTE") return true;
  return getExamAvailabilityLabel(exam) === "Disponible";
}

function getExamStateChip(exam: ExamListItem) {
  const now = new Date();
  const desde = exam.disponibleDesde ? new Date(exam.disponibleDesde) : null;
  const cierre = desde ? new Date(desde.getTime() + exam.duracionMinutos * 60_000) : null;
  const disponible = Boolean(exam.publicadoEn) && desde !== null && desde <= now && cierre !== null && cierre > now;
  const vencido = cierre !== null && cierre < now;

  if (!exam.publicadoEn) return { label: "Borrador", chipClass: "chip-capturas" };
  if (vencido) return { label: "Vencido", chipClass: "chip-resumen" };
  if (disponible) return { label: "En curso", chipClass: "chip-ok" };
  return { label: "Pendiente", chipClass: "chip-capturas" };
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
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">Sin exámenes</p>
            <p>{canManageExams ? "Crea el primer examen desde el botón de arriba." : "Cuando exista una evaluación para tu rol, aparecerá aquí."}</p>
          </div>
        </div>
      ) : (
        <div className="session-list" aria-label="Exámenes disponibles">
          {data.exams.map((exam) => {
            const estado = getExamStateChip(exam);
            const desde = exam.disponibleDesde ? new Date(exam.disponibleDesde) : null;
            const cierre = desde ? new Date(desde.getTime() + exam.duracionMinutos * 60_000) : null;
            return (
              <article className="session-card" style={{ cursor: "default" }} key={exam.id}>
                <div className="session-info">
                  <div className="session-title">{exam.titulo}</div>
                  <div style={{ fontSize: 13, color: "var(--texto-tenue)", marginTop: 4 }}>
                    {exam.curso.nombre} · {exam.duracionMinutos} min · {exam._count.preguntas} pregunta(s)
                    {desde && ` · Inicio ${desde.toLocaleString("es-PE", { timeZone: "America/Lima" })}`}
                    {cierre && ` · Cierre ${cierre.toLocaleString("es-PE", { timeZone: "America/Lima" })}`}
                  </div>
                  <div className="session-chips" style={{ marginTop: 6 }}>
                    <span className={`chip ${estado.chipClass}`}>{estado.label}</span>
                    {exam._count.envios > 0 && (
                      <span className="chip chip-grabacion">{exam._count.envios} envío(s)</span>
                    )}
                  </div>
                  {exam.descripcion && (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--texto-secundario)" }}>{exam.descripcion}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  {canOpenExam(exam, session.user.rol) ? (
                    <Link className="btn btn-primary" style={{ fontSize: 13 }} href={`/exams/${exam.id}`}>
                      {session.user.rol === "ESTUDIANTE" ? "Dar examen" : "Abrir"}
                    </Link>
                  ) : (
                    <span className="btn btn-secondary" style={{ fontSize: 13, opacity: 0.5, cursor: "not-allowed" }} aria-disabled="true">
                      No disponible
                    </span>
                  )}
                  {exam._count.envios > 0 || session.user.rol !== "ESTUDIANTE" ? (
                    <Link className="btn btn-secondary" style={{ fontSize: 13 }} href={`/exams/${exam.id}/results`}>
                      Resultados
                    </Link>
                  ) : null}
                  {canManageExams && !exam.publicadoEn ? (
                    <form action={publishExam}>
                      <input name="examId" type="hidden" value={exam.id} />
                      <button className="btn btn-primary" style={{ fontSize: 13 }} type="submit">
                        Publicar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
