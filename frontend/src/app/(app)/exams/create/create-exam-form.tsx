"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api-error";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { CourseOption } from "../types";

type QuestionForm = {
  texto: string;
  tipo: "OPCION_MULTIPLE" | "VERDADERO_FALSO" | "ABIERTA";
  opciones: string[];
  respuestaCorrecta: string;
  puntaje: number;
};

type CreateExamFormProps = {
  courses: CourseOption[];
};

const emptyQuestion = (): QuestionForm => ({
  texto: "",
  tipo: "OPCION_MULTIPLE",
  opciones: ["", ""],
  respuestaCorrecta: "",
  puntaje: 1,
});

export function CreateExamForm({ courses }: CreateExamFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuestionForm[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateQuestion(index: number, value: Partial<QuestionForm>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...value } : question,
      ),
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const opciones = question.opciones.map((option, currentOptionIndex) =>
          currentOptionIndex === optionIndex ? value : option,
        );

        return {
          ...question,
          opciones,
          respuestaCorrecta:
            question.respuestaCorrecta === question.opciones[optionIndex]
              ? value
              : question.respuestaCorrecta,
        };
      }),
    );
  }

  function changeQuestionType(index: number, tipo: QuestionForm["tipo"]) {
    const nextOptions =
      tipo === "VERDADERO_FALSO" ? ["Verdadero", "Falso"] : tipo === "ABIERTA" ? [] : ["", ""];

    updateQuestion(index, {
      tipo,
      opciones: nextOptions,
      respuestaCorrecta: tipo === "ABIERTA" ? "" : "",
    });
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex || question.opciones.length <= 2) {
          return question;
        }

        const removedOption = question.opciones[optionIndex];
        const opciones = question.opciones.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex);

        return {
          ...question,
          opciones,
          respuestaCorrecta: question.respuestaCorrecta === removedOption ? "" : question.respuestaCorrecta,
        };
      }),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const toISOLocal = (v: string) => (v ? new Date(v).toISOString() : undefined);
    const duracionMinutos = Number(formData.get("duracionMinutos") ?? 0);
    const ingresoHastaMin = Number(formData.get("ingresoHastaMin") ?? 10);

    if (ingresoHastaMin >= duracionMinutos) {
      setError(t("exams.entryTimeError"));
      setIsSubmitting(false);
      return;
    }

    const payload = {
      titulo: String(formData.get("titulo") ?? ""),
      descripcion: String(formData.get("descripcion") ?? "") || undefined,
      cursoId: String(formData.get("cursoId") ?? ""),
      duracionMinutos,
      ingresoHastaMin,
      disponibleDesde: toISOLocal(String(formData.get("disponibleDesde") ?? "")),
      preguntas: questions.map((question) => ({
        texto: question.texto,
        tipo: question.tipo,
        opciones: question.opciones.map((option) => option.trim()).filter(Boolean),
        respuestaCorrecta: question.respuestaCorrecta,
        puntaje: question.puntaje,
      })),
    };

    const response = await fetch("/api/backend/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(await readApiError(response, t("exams.createErrorFallback")));
      return;
    }

    router.push("/exams");
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ margin: 0 }}>{t("exams.formHeader")}</h3>
      </div>
      <form className="card-body" onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      <div className="form-grid">
        <label className="field">
          <span>{t("exams.titleLabel")}</span>
          <input name="titulo" required minLength={3} maxLength={150} />
        </label>

        <label className="field">
          <span>{t("exams.courseLabel")}</span>
          <select name="cursoId" required>
            <option value="">{t("exams.selectCourse")}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {t("exams.courseOption", { nombre: course.nombre, ciclo: course.ciclo, anio: course.anio })}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("exams.durationLabel")}</span>
          <input name="duracionMinutos" type="number" min={2} max={300} defaultValue={30} required />
        </label>

        <label className="field">
          <span>{t("exams.startLabel")}</span>
          <input name="disponibleDesde" type="datetime-local" />
        </label>

        <label className="field">
          <span>{t("exams.entryWindowLabel")}</span>
          <input name="ingresoHastaMin" type="number" min={1} max={299} defaultValue={10} required
            title={t("exams.entryWindowHint")} />
        </label>

        <label className="field full-row">
          <span>{t("exams.descriptionLabel")}</span>
          <textarea name="descripcion" maxLength={500} rows={3} />
        </label>
      </div>

      <div className="stack">
        {questions.map((question, questionIndex) => (
          <fieldset className="question-box google-question" key={questionIndex}>
            <div className="question-toolbar">
              <legend>
                <span className="chip chip-capturas">{t("exams.questionNumber", { numero: questionIndex + 1 })}</span>
              </legend>
              <select
                value={question.tipo}
                onChange={(event) => changeQuestionType(questionIndex, event.target.value as QuestionForm["tipo"])}
              >
                <option value="OPCION_MULTIPLE">{t("exams.typeMultipleChoice")}</option>
                <option value="VERDADERO_FALSO">{t("exams.typeTrueFalse")}</option>
                <option value="ABIERTA">{t("exams.typeOpenAnswer")}</option>
              </select>
            </div>

            <label className="field">
              <span>{t("exams.questionLabel")}</span>
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={2}
                placeholder={t("exams.questionPlaceholder")}
                value={question.texto}
                onChange={(event) => updateQuestion(questionIndex, { texto: event.target.value })}
              />
            </label>

            {question.tipo === "ABIERTA" ? (
              <div className="open-answer-preview">{t("exams.openAnswerPreview")}</div>
            ) : (
              <div className="forms-option-list">
                {question.opciones.map((option, optionIndex) => (
                  <div className="forms-option-row" key={optionIndex}>
                    <input
                      type="radio"
                      aria-label={t("exams.markCorrectOption", { numero: optionIndex + 1 })}
                      checked={question.respuestaCorrecta === option && option.trim().length > 0}
                      onChange={() => updateQuestion(questionIndex, { respuestaCorrecta: option })}
                    />
                    <input
                      required
                      maxLength={300}
                      placeholder={t("exams.optionPlaceholder", { numero: optionIndex + 1 })}
                      value={option}
                      disabled={question.tipo === "VERDADERO_FALSO"}
                      onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                    />
                    {question.tipo === "OPCION_MULTIPLE" && question.opciones.length > 2 ? (
                      <button
                        className="btn btn-secondary icon-button"
                        type="button"
                        aria-label={t("exams.removeOptionAria")}
                        onClick={() => removeOption(questionIndex, optionIndex)}
                      >
                        x
                      </button>
                    ) : null}
                  </div>
                ))}
                {question.tipo === "OPCION_MULTIPLE" && question.opciones.length < 6 ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => updateQuestion(questionIndex, { opciones: [...question.opciones, ""] })}
                  >
                    {t("exams.addOption")}
                  </button>
                ) : null}
              </div>
            )}

            <div className="question-footer">
              <label className="field points-field">
                <span>{t("exams.points")}</span>
                <input
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.1}
                  value={question.puntaje}
                  onFocus={(e) => e.target.select()}
                  onChange={(event) => {
                    const v = parseFloat(event.target.value);
                    updateQuestion(questionIndex, { puntaje: Number.isNaN(v) ? 0.1 : v });
                  }}
                  required
                />
              </label>
              {questions.length > 1 ? (
                <button className="btn btn-secondary" type="button" onClick={() => removeQuestion(questionIndex)}>
                  {t("exams.removeQuestionButton")}
                </button>
              ) : null}
            </div>
          </fieldset>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card-actions">
        <button className="btn btn-secondary" type="button" onClick={() => setQuestions([...questions, emptyQuestion()])}>
          {t("exams.addQuestion")}
        </button>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? t("exams.saving") : t("exams.createExam")}
        </button>
      </div>
      </form>
    </div>
  );
}
