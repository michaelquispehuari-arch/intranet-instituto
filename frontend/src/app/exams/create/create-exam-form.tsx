"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseOption } from "../types";

type QuestionForm = {
  texto: string;
  opciones: string[];
  respuestaCorrecta: string;
  puntaje: number;
};

type CreateExamFormProps = {
  courses: CourseOption[];
};

const emptyQuestion = (): QuestionForm => ({
  texto: "",
  opciones: ["", ""],
  respuestaCorrecta: "",
  puntaje: 1,
});

export function CreateExamForm({ courses }: CreateExamFormProps) {
  const router = useRouter();
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      titulo: String(formData.get("titulo") ?? ""),
      descripcion: String(formData.get("descripcion") ?? "") || undefined,
      cursoId: String(formData.get("cursoId") ?? ""),
      duracionMinutos: Number(formData.get("duracionMinutos") ?? 0),
      disponibleDesde: String(formData.get("disponibleDesde") ?? "") || undefined,
      disponibleHasta: String(formData.get("disponibleHasta") ?? "") || undefined,
      preguntas: questions.map((question) => ({
        texto: question.texto,
        opciones: question.opciones,
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
      setError("No se pudo crear el examen. Revisa los campos.");
      return;
    }

    router.push("/exams");
    router.refresh();
  }

  return (
    <form className="panel form wide-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span>Titulo</span>
          <input name="titulo" required minLength={3} maxLength={150} />
        </label>

        <label className="field">
          <span>Curso</span>
          <select name="cursoId" required>
            <option value="">Selecciona un curso</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.nombre} - ciclo {course.ciclo}, {course.anio}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Duracion en minutos</span>
          <input name="duracionMinutos" type="number" min={1} max={300} defaultValue={30} required />
        </label>

        <label className="field">
          <span>Disponible desde</span>
          <input name="disponibleDesde" type="datetime-local" />
        </label>

        <label className="field">
          <span>Disponible hasta</span>
          <input name="disponibleHasta" type="datetime-local" />
        </label>

        <label className="field full-row">
          <span>Descripcion</span>
          <textarea name="descripcion" maxLength={500} rows={3} />
        </label>
      </div>

      <div className="stack">
        {questions.map((question, questionIndex) => (
          <fieldset className="question-box" key={questionIndex}>
            <legend>Pregunta {questionIndex + 1}</legend>
            <label className="field">
              <span>Texto</span>
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                value={question.texto}
                onChange={(event) => updateQuestion(questionIndex, { texto: event.target.value })}
              />
            </label>

            <div className="option-grid">
              {question.opciones.map((option, optionIndex) => (
                <label className="field" key={optionIndex}>
                  <span>Opcion {optionIndex + 1}</span>
                  <input
                    required
                    maxLength={300}
                    value={option}
                    onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="card-actions">
              {question.opciones.length < 6 ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    updateQuestion(questionIndex, { opciones: [...question.opciones, ""] })
                  }
                >
                  Agregar opcion
                </button>
              ) : null}
              {question.opciones.length > 2 ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    updateQuestion(questionIndex, { opciones: question.opciones.slice(0, -1) })
                  }
                >
                  Quitar opcion
                </button>
              ) : null}
            </div>

            <div className="form-grid compact">
              <label className="field">
                <span>Respuesta correcta</span>
                <select
                  required
                  value={question.respuestaCorrecta}
                  onChange={(event) =>
                    updateQuestion(questionIndex, { respuestaCorrecta: event.target.value })
                  }
                >
                  <option value="">Selecciona respuesta</option>
                  {question.opciones
                    .filter((option) => option.trim().length > 0)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
              </label>

              <label className="field">
                <span>Puntaje</span>
                <input
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.1}
                  value={question.puntaje}
                  onChange={(event) =>
                    updateQuestion(questionIndex, { puntaje: Number(event.target.value) })
                  }
                  required
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card-actions">
        <button className="button secondary" type="button" onClick={() => setQuestions([...questions, emptyQuestion()])}>
          Agregar pregunta
        </button>
        {questions.length > 1 ? (
          <button className="button secondary" type="button" onClick={() => setQuestions(questions.slice(0, -1))}>
            Quitar pregunta
          </button>
        ) : null}
        <button className="button" type="submit" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? "Guardando..." : "Crear examen"}
        </button>
      </div>
    </form>
  );
}
