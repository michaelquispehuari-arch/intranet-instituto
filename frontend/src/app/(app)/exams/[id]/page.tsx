import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackendRequestError, backendGet } from "@/lib/backend";
import type { ExamDetail } from "../types";
import { TakeExamForm } from "./take-exam-form";

type ExamPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamPage({ params }: ExamPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  let data: { exam: ExamDetail };
  try {
    data = await backendGet<{ exam: ExamDetail }>(`/api/exams/${id}`, session);
  } catch (error) {
    const message =
      error instanceof BackendRequestError && error.statusCode === 403
        ? "El examen no esta disponible para rendir en este momento. Revisa la fecha y hora programadas."
        : error instanceof Error
          ? error.message
          : "No se pudo cargar el examen.";

    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
            Volver a examenes
          </Link>
        </div>
        <section className="card empty-state">
          <p className="empty-state-title">Examen no disponible</p>
          <p>{message}</p>
        </section>
      </div>
    );
  }
  const exam = data.exam;
  const canTakeExam = session.user.rol === "ESTUDIANTE";

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          ← Examenes
        </Link>
      </div>

        <section className="page-header">
          <span className="badge">{exam.curso.nombre}</span>
          <h1 className="page-title">{exam.titulo}</h1>
          <p className="page-subtitle">
            {exam.descripcion ?? "Sin descripcion"} · {exam.duracionMinutos} minutos
          </p>
        </section>

        {canTakeExam && exam.intento?.completado ? (
          <section className="card empty-state">
            <h2>{exam.esSustitutorio ? "Examen finalizado" : "Examen enviado"}</h2>
            <p className="muted">
              {exam.esSustitutorio
                ? "Tu respuesta fue registrada. El administrador revisará y publicará la nota."
                : "Tu envío ya fue registrado."}
            </p>
            {!exam.esSustitutorio && (
              <div className="card-actions">
                <Link className="btn btn-primary" href={`/exams/${exam.id}/results`}>
                  Ver resultado
                </Link>
              </div>
            )}
          </section>
        ) : canTakeExam ? (
          <TakeExamForm exam={exam} />
        ) : (
          <section className="card" style={{ padding: 20 }}>
            <div className="stack">
              {exam.preguntas.map((question) => (
                <article className="question-box" key={question.id}>
                  <span className="badge">Pregunta {question.orden}</span>
                  <h2>{question.texto}</h2>
                  <p className="muted">Puntaje: {question.puntaje}</p>
                  {question.tipo === "ABIERTA" ? (
                    <p className="muted">Respuesta abierta para calificacion manual.</p>
                  ) : (
                    <ul className="answer-list">
                      {question.opciones.map((option) => (
                        <li key={option} className={option === question.respuestaCorrecta ? "correct-answer" : ""}>
                          {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}
