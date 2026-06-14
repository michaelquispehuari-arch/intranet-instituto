import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
import type { ExamResults } from "../../types";

type ExamResultsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatScore(value: number | null) {
  return value === null ? "Sin puntaje" : value.toFixed(2);
}

export default async function ExamResultsPage({ params }: ExamResultsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let data: ExamResults | null = null;

  try {
    data = await backendGet<ExamResults>(`/api/exams/${id}/results`, session);
  } catch {
    data = null;
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          ← Examenes
        </Link>
      </div>

        <section className="page-header">
          <span className="badge">Resultados</span>
          <h1 className="page-title">{data?.exam.titulo ?? "Resultado no disponible"}</h1>
          <p className="page-subtitle">Resultados registrados por el backend.</p>
        </section>

        {!data || data.submissions.length === 0 ? (
          <section className="card empty-state">
            <strong>Sin envios completados.</strong>
            <p className="muted">Cuando un estudiante envie el examen, el resultado aparecera aqui.</p>
          </section>
        ) : (
          <section className="stack" aria-label="Resultados del examen">
            {data.submissions.map((submission) => (
              <article className="card result-card" style={{ padding: 20 }} key={submission.id}>
                <div className="result-header">
                  <div>
                    <span className="badge">{formatScore(submission.puntajeTotal)}</span>
                    <h2>
                      {submission.estudiante.nombre} {submission.estudiante.apellido}
                    </h2>
                    <p className="muted">{submission.estudiante.email}</p>
                  </div>
                  <p className="muted">
                    {submission.enviadoEn
                      ? new Intl.DateTimeFormat("es-PE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(submission.enviadoEn))
                      : "Sin fecha"}
                  </p>
                </div>

                <div className="stack compact-stack">
                  {submission.respuestas.map((answer) => (
                    <div className="answer-row" key={answer.id}>
                      <strong>{answer.pregunta.texto}</strong>
                      <p>Respuesta: {answer.respuesta}</p>
                      <p className={answer.esCorrecta ? "success-text" : "error"}>
                        {answer.esCorrecta ? "Correcta" : `Correcta: ${answer.pregunta.respuestaCorrecta}`}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
    </div>
  );
}
