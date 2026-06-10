"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CourseOption } from "../types";

type UploadContentFormProps = {
  courses: CourseOption[];
};

export function UploadContentForm({ courses }: UploadContentFormProps) {
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
      setError("No se pudo subir el material. Revisa el archivo, curso y credenciales R2.");
      return;
    }

    router.push("/content");
    router.refresh();
  }

  return (
    <form className="panel form wide-form" onSubmit={handleSubmit}>
      <div className="form-grid">
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
          <span>Nombre visible</span>
          <input name="nombre" minLength={3} maxLength={150} />
        </label>

        <label className="field full-row">
          <span>Archivo</span>
          <input
            name="file"
            type="file"
            accept=".pdf,.mp4,.mp3,.docx,.pptx,.xlsx,.jpg,.jpeg,.png"
            required
          />
        </label>

        <label className="field full-row">
          <span>Descripcion</span>
          <textarea name="descripcion" maxLength={500} rows={3} />
        </label>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card-actions">
        <button className="button" type="submit" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? "Subiendo..." : "Subir material"}
        </button>
      </div>
    </form>
  );
}
