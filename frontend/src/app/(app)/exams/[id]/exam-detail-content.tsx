"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { ExamDetail } from "../types";
import { TakeExamForm } from "./take-exam-form";

type LoadError = {
  message: string;
  isForbidden: boolean;
};

type ExamDetailContentProps = {
  exam: ExamDetail | null;
  loadError: LoadError | null;
  canTakeExam: boolean;
};

export function ExamDetailContent({ exam, loadError, canTakeExam }: ExamDetailContentProps) {
  const { t } = useTranslation();

  if (loadError) {
    const message = loadError.isForbidden
      ? t("exams.detailNotAvailableMessage")
      : loadError.message || t("exams.detailLoadErrorFallback");

    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
            {t("exams.backToExamsButton")}
          </Link>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <p className="empty-state-title">{t("exams.detailNotAvailableTitle")}</p>
            <p>{message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          {t("exams.backToExamsLink")}
        </Link>
      </div>

        <div className="page-header">
          <span className="page-eyebrow">{exam.curso.nombre}</span>
          <h1 className="page-title">{exam.titulo}</h1>
          <p className="page-subtitle">
            {exam.descripcion ?? t("exams.noDescription")} · {t("exams.durationMinutes", { minutos: exam.duracionMinutos })}
          </p>
        </div>

        {canTakeExam && exam.intento?.completado ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <p className="empty-state-title">{exam.esSustitutorio ? t("exams.finishedTitle") : t("exams.submittedTitle")}</p>
              <p>
                {exam.esSustitutorio
                  ? t("exams.substitutoryPendingDesc")
                  : t("exams.submissionRegisteredDesc")}
              </p>
              {!exam.esSustitutorio && (
                <div className="card-actions" style={{ justifyContent: "center", marginTop: 16 }}>
                  <Link className="btn btn-primary" href={`/exams/${exam.id}/results`}>
                    {t("exams.viewResult")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : canTakeExam ? (
          <TakeExamForm exam={exam} />
        ) : (
          <section className="card" style={{ padding: 20 }}>
            <div className="stack">
              {exam.preguntas.map((question) => (
                <article className="question-box" key={question.id}>
                  <span className="chip chip-capturas">{t("exams.questionNumber", { numero: question.orden })}</span>
                  <h2>{question.texto}</h2>
                  <p className="muted">{t("exams.pointsValue", { puntaje: question.puntaje })}</p>
                  {question.tipo === "ABIERTA" ? (
                    <p className="muted">{t("exams.openAnswerManualGrading")}</p>
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
