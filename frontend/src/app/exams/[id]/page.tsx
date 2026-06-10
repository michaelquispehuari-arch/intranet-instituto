import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
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
    <main className="page">
      <div className="shell dashboard">
        <header className="topbar">
          <div className="brand">
            <strong>{exam.titulo}</strong>
            <span className="muted">{session.user.email}</span>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/exams">
              Volver
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="panel hero">
          <span className="badge">{exam.curso.nombre}</span>
          <h1>{exam.titulo}</h1>
          <p className="muted">
            {exam.descripcion ?? "Sin descripcion"} · {exam.duracionMinutos} minutos
          </p>
        </section>

        {canTakeExam ? (
          <TakeExamForm exam={exam} />
        ) : (
          <section className="panel form wide-form">
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
    </main>
  );
}
