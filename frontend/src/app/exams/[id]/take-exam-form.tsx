"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamDetail } from "../types";

type TakeExamFormProps = {
  exam: ExamDetail;
};

export function TakeExamForm({ exam }: TakeExamFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const respuestas = exam.preguntas.map((question) => ({
      preguntaId: question.id,
      respuesta: answers[question.id] ?? "",
    }));

    if (respuestas.some((answer) => answer.respuesta.length === 0)) {
      setError("Debes responder todas las preguntas.");
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
      setError("No se pudo enviar el examen. Verifica si ya fue enviado o si sigue disponible.");
      return;
    }

    router.push(`/exams/${exam.id}/results`);
    router.refresh();
  }

  return (
    <form className="panel form wide-form" onSubmit={handleSubmit}>
      <div className="stack">
        {exam.preguntas.map((question) => (
          <fieldset className="question-box" key={question.id}>
            <legend>Pregunta {question.orden}</legend>
            <h2>{question.texto}</h2>
            <p className="muted">Puntaje: {question.puntaje}</p>
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
          </fieldset>
        ))}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card-actions">
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar examen"}
        </button>
      </div>
    </form>
  );
}
