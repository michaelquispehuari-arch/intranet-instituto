import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { backendGet } from "@/lib/backend";
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
  const data = await backendGet<{ exam: ExamDetail }>(`/api/exams/${id}`, session);
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
            <h2>Examen enviado</h2>
            <p className="muted">Tu envio ya fue registrado.</p>
            <div className="card-actions">
              <Link className="btn btn-primary" href={`/exams/${exam.id}/results`}>
                Ver resultado
              </Link>
            </div>
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
                  <ul className="answer-list">
                    {question.opciones.map((option) => (
                      <li key={option} className={option === question.respuestaCorrecta ? "correct-answer" : ""}>
                        {option}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}
