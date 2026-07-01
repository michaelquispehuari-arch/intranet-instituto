import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { ExamResults } from "../../types";

type ExamResultsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
};

function formatScore(value: number | null) {
  return value === null ? "–" : value.toFixed(2);
}

export default async function ExamResultsPage({ params, searchParams }: ExamResultsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const { studentId } = await searchParams;
  const role = session.user.rol;

  let data: ExamResults | null = null;
  let beforeCloseAt: string | null = null;
  let notAvailable = false;

  try {
    data = await backendGet<ExamResults>(`/api/exams/${id}/results`, session);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const match = msg.match(/BEFORE_CLOSE:(.+)/);
    if (match) beforeCloseAt = match[1];
    if (msg.includes("RESULTS_NOT_AVAILABLE")) notAvailable = true;
    data = null;
  }

  const cierreLabel = beforeCloseAt
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(beforeCloseAt))
    : null;

  const backLink = (
    <div style={{ marginBottom: 12 }}>
      <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
        ← Exámenes
      </Link>
    </div>
  );

  if (notAvailable) {
    return (
      <div>
        {backLink}
        <section className="card empty-state">
          <strong>Resultados no disponibles</strong>
          <p className="muted">Los resultados de este examen serán revisados y publicados por el administrador.</p>
        </section>
      </div>
    );
  }

  if (cierreLabel) {
    return (
      <div>
        {backLink}
        <section className="card empty-state">
          <strong>Resultado aún no disponible</strong>
          <p className="muted">El resultado estará disponible a partir de las {cierreLabel}, cuando cierre el examen para todos.</p>
        </section>
      </div>
    );
  }

  if (!data || data.submissions.length === 0) {
    return (
      <div>
        {backLink}
        <section className="page-header">
          <span className="badge">Resultados</span>
          <h1 className="page-title">{data?.exam.titulo ?? "Examen"}</h1>
        </section>
        <section className="card empty-state">
          <strong>Sin envíos completados.</strong>
          <p className="muted">Cuando un estudiante envíe el examen, el resultado aparecerá aquí.</p>
        </section>
      </div>
    );
  }

  // ADMIN / PROFESOR: lista de alumnos → detalle por studentId
  if (role === "ADMIN" || role === "PROFESOR") {
    if (studentId) {
      const sub = data.submissions.find((s) => s.estudiante.id === studentId);
      if (!sub) {
        return (
          <div>
            {backLink}
            <div style={{ marginBottom: 12 }}>
              <Link href={`/exams/${id}/results`} style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                ← Lista de alumnos
              </Link>
            </div>
            <section className="card empty-state">
              <p>Alumno no encontrado en los resultados de este examen.</p>
            </section>
          </div>
        );
      }

      return (
        <div>
          {backLink}
          <div style={{ marginBottom: 12 }}>
            <Link href={`/exams/${id}/results`} style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
              ← Lista de alumnos
            </Link>
          </div>
          <section className="page-header">
            <span className="badge">Respuestas</span>
            <h1 className="page-title">{data.exam.titulo}</h1>
            <p className="page-subtitle">
              {sub.estudiante.nombre} {sub.estudiante.apellido} · {sub.estudiante.email}
            </p>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span className="badge">Puntaje total: {formatScore(sub.puntajeTotal)}</span>
              {sub.enviadoEn && (
                <span style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                  Enviado:{" "}
                  {new Intl.DateTimeFormat("es-PE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Lima",
                  }).format(new Date(sub.enviadoEn))}
                </span>
              )}
            </div>
            <div className="stack compact-stack">
              {sub.respuestas.map((answer) => (
                <div className="answer-row" key={answer.id}>
                  <strong>{answer.pregunta.texto}</strong>
                  <p>Respuesta: {answer.respuesta}</p>
                  {answer.estadoCalificacion === "PENDIENTE" ? (
                    <p style={{ color: "var(--amber-action)" }}>Pendiente de calificación manual</p>
                  ) : answer.esCorrecta ? (
                    <p className="success-text">Correcta · {answer.puntajeObtenido} pts</p>
                  ) : (
                    <p className="error">
                      Incorrecta · {answer.puntajeObtenido} pts
                      {answer.pregunta.respuestaCorrecta
                        ? ` · Correcta: ${answer.pregunta.respuestaCorrecta}`
                        : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    // Lista de alumnos
    return (
      <div>
        {backLink}
        <section className="page-header">
          <span className="badge">Resultados</span>
          <h1 className="page-title">{data.exam.titulo}</h1>
          <p className="page-subtitle">{data.submissions.length} alumno(s) completaron el examen.</p>
        </section>
        <section className="stack" aria-label="Lista de alumnos">
          {data.submissions.map((sub) => (
            <article className="card" style={{ padding: "16px 20px" }} key={sub.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {sub.estudiante.nombre} {sub.estudiante.apellido}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>{sub.estudiante.email}</div>
                  {sub.enviadoEn && (
                    <div style={{ fontSize: 12, color: "var(--texto-tenue)", marginTop: 2 }}>
                      {new Intl.DateTimeFormat("es-PE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Lima",
                      }).format(new Date(sub.enviadoEn))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="badge">{formatScore(sub.puntajeTotal)} pts</span>
                  <Link
                    href={`/exams/${id}/results?studentId=${sub.estudiante.id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: 13 }}
                  >
                    Ver examen
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

  // ESTUDIANTE: solo ve su propio resultado
  const mySubmission = data.submissions[0];
  return (
    <div>
      {backLink}
      <section className="page-header">
        <span className="badge">Mi resultado</span>
        <h1 className="page-title">{data.exam.titulo}</h1>
        <p className="page-subtitle">Puntaje total: {formatScore(mySubmission.puntajeTotal)}</p>
      </section>
      <section className="card" style={{ padding: 20 }}>
        <div className="stack compact-stack">
          {mySubmission.respuestas.map((answer) => (
            <div className="answer-row" key={answer.id}>
              <strong>{answer.pregunta.texto}</strong>
              <p>Respuesta: {answer.respuesta}</p>
              {answer.esCorrecta ? (
                <p className="success-text">Correcta · {answer.puntajeObtenido} pts</p>
              ) : (
                <p className="error">
                  Incorrecta · {answer.puntajeObtenido} pts
                  {answer.pregunta.respuestaCorrecta
                    ? ` · Correcta: ${answer.pregunta.respuestaCorrecta}`
                    : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
