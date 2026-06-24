"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api-error";
import type { CourseOption } from "../types";

type UploadFormProps = {
  courses: CourseOption[];
  selectedCourseId?: string;
};

export function UploadForm({ courses, selectedCourseId }: UploadFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/backend/content", {
      method: "POST",
      body: formData,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setError(
        await readApiError(
          response,
          "No se pudo subir el material. Revisa el archivo, curso y credenciales R2.",
        ),
      );
      return;
    }

    router.push("/material");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      <div className="field">
        <label htmlFor="cursoId">Curso</label>
        <select id="cursoId" name="cursoId" defaultValue={selectedCourseId ?? ""} required>
          <option value="">Selecciona un curso</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} — ciclo {c.ciclo}, {c.anio}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="nombre">Nombre visible</label>
        <input id="nombre" name="nombre" minLength={3} maxLength={150} required />
      </div>

      <div className="field">
        <label htmlFor="files">Archivos (puedes seleccionar varios)</label>
        <input
          id="files"
          name="files"
          type="file"
          accept=".pdf,.mp4,.mp3,.docx,.pptx,.xlsx,.jpg,.jpeg,.png"
          multiple
          required
        />
      </div>

      <div className="field">
        <label htmlFor="descripcion">Descripción</label>
        <textarea id="descripcion" name="descripcion" maxLength={500} rows={3} />
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--desaprobado-texto)" }}>{error}</p>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? "Subiendo…" : "Subir material"}
        </button>
      </div>
    </form>
  );
}
