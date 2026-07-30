"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api-error";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { ExamDetail } from "../types";

type TakeExamFormProps = {
  exam: ExamDetail;
};

export function TakeExamForm({ exam }: TakeExamFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(exam.tiempoRestanteSegundos ?? null);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => (current === null ? null : Math.max(0, current - 1)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingSeconds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (remainingSeconds === 0) {
      setError(t("exams.timeUp"));
      return;
    }

    const respuestas = exam.preguntas.map((question) => ({
      preguntaId: question.id,
      respuesta: answers[question.id] ?? "",
    }));

    if (respuestas.some((answer) => answer.respuesta.length === 0)) {
      setError(t("exams.answerAllRequired"));
      return;
    }

    setIsSubmitting(true);
    const response = await fetch(`/api/backend/exams/${exam.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuestas }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        await readApiError(
          response,
          t("exams.submitErrorFallback"),
        ),
      );
      return;
    }

    if (exam.esSustitutorio) {
      setFinished(true);
      return;
    }

    router.push(`/exams/${exam.id}/results`);
    router.refresh();
  }

  if (finished) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p className="empty-state-title">{t("exams.finishedTitle")}</p>
          <p>{t("exams.substitutoryFinishedDesc")}</p>
          <div className="card-actions" style={{ justifyContent: "center", marginTop: 16 }}>
            <Link href="/exams" className="btn btn-secondary">
              {t("exams.backToExamsButton")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remainingLabel =
    remainingSeconds === null
      ? null
      : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="card">
      {remainingLabel ? (
        <div className="card-header">
          <h3 style={{ margin: 0 }}>{t("exams.takingExam")}</h3>
          <span className={`chip ${remainingSeconds !== null && remainingSeconds < 60 ? "chip-resumen" : "chip-capturas"}`}>
            {t("exams.timeRemaining", { tiempo: remainingLabel })}
          </span>
        </div>
      ) : null}

      <form className="card-body" onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      <div className="stack">
        {exam.preguntas.map((question) => (
          <fieldset className="question-box" key={question.id}>
            <legend>
              <span className="chip chip-capturas">{t("exams.questionNumber", { numero: question.orden })}</span>
            </legend>
            <h2>{question.texto}</h2>
            <p className="muted">{t("exams.pointsValue", { puntaje: question.puntaje })}</p>
            {question.tipo === "ABIERTA" ? (
              <label className="field">
                <span>{t("exams.answerLabel")}</span>
                <textarea
                  rows={5}
                  maxLength={2000}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                  required
                />
              </label>
            ) : (
              <div className="radio-list">
                {question.opciones.map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswers({ ...answers, [question.id]: option })}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card-actions">
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || remainingSeconds === 0}>
          {isSubmitting ? t("exams.submitting") : t("exams.submitExam")}
        </button>
      </div>
      </form>
    </div>
  );
}
