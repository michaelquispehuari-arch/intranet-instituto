"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api-error";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { ExamResults } from "../../types";

type Answer = ExamResults["submissions"][number]["respuestas"][number];

type AdminAnswerListProps = {
  examId: string;
  answers: Answer[];
  esSustitutorio: boolean;
  canGrade: boolean; // true solo para ADMIN
};

// Respuestas de un alumno vistas por ADMIN/PROFESOR. Si canGrade, las preguntas ABIERTA
// (estadoCalificacion != AUTO) llevan una casilla de nota y un solo boton "Guardar notas" para todo el envio.
export function AdminAnswerList({ examId, answers, esSustitutorio, canGrade: isAdmin }: AdminAnswerListProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const openAnswers = answers.filter((answer) => answer.estadoCalificacion !== "AUTO");
  const canGrade = isAdmin && openAnswers.length > 0 && !esSustitutorio;

  const [grades, setGrades] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      openAnswers.map((answer) => [
        answer.id,
        answer.estadoCalificacion === "CALIFICADA" ? String(answer.puntajeObtenido) : "",
      ]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave() {
    setFeedback(null);

    // Una casilla vacia no se envia: la respuesta sigue pendiente en vez de quedar calificada con 0.
    const calificaciones = openAnswers
      .filter((answer) => (grades[answer.id] ?? "").trim() !== "")
      .map((answer) => ({ respuestaId: answer.id, puntajeManual: Number(grades[answer.id]) }));

    if (calificaciones.length === 0) return;

    setIsSaving(true);
    const response = await fetch(`/api/backend/exams/${examId}/grade-open`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificaciones }),
    });
    setIsSaving(false);

    if (!response.ok) {
      setFeedback({ ok: false, text: await readApiError(response, t("exams.gradeSaveError")) });
      return;
    }

    setFeedback({ ok: true, text: t("exams.gradesSaved") });
    router.refresh();
  }

  return (
    <>
      <div className="stack compact-stack">
        {answers.map((answer) => (
          <div className="answer-row" key={answer.id}>
            <strong>{answer.pregunta.texto}</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{t("exams.answerValue", { respuesta: answer.respuesta })}</p>
            {answer.estadoCalificacion === "PENDIENTE" ? (
              <p style={{ color: "var(--amber-action)" }}>{t("exams.pendingManualGrading")}</p>
            ) : answer.esCorrecta ? (
              <p className="success-text">{t("exams.correctPoints", { puntaje: answer.puntajeObtenido })}</p>
            ) : (
              <p className="error">
                {t("exams.incorrectPoints", { puntaje: answer.puntajeObtenido })}
                {answer.pregunta.respuestaCorrecta
                  ? ` ${t("exams.correctAnswerSuffix", { respuesta: answer.pregunta.respuestaCorrecta })}`
                  : ""}
              </p>
            )}
            {canGrade && answer.estadoCalificacion !== "AUTO" ? (
              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                {t("exams.gradeLabel", { max: answer.pregunta.puntaje })}
                <input
                  type="number"
                  min={0}
                  max={answer.pregunta.puntaje}
                  step={0.5}
                  value={grades[answer.id] ?? ""}
                  onChange={(event) => setGrades((current) => ({ ...current, [answer.id]: event.target.value }))}
                  style={{ width: 80, padding: "4px 8px", border: "1px solid var(--borde)", borderRadius: 6, fontSize: 13 }}
                />
              </label>
            ) : null}
          </div>
        ))}
      </div>

      {canGrade ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
          <button className="btn btn-primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("exams.savingGrades") : t("exams.saveGrades")}
          </button>
          {feedback ? (
            <span className={feedback.ok ? "success-text" : "error"} style={{ fontSize: 13 }}>
              {feedback.text}
            </span>
          ) : null}
        </div>
      ) : null}

      {isAdmin && openAnswers.length > 0 && esSustitutorio ? (
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--texto-tenue)" }}>
          {t("exams.substitutoryGradeHint")}{" "}
          <Link href="/sustitutorios">{t("exams.goToSubstitutory")}</Link>
        </p>
      ) : null}
    </>
  );
}
