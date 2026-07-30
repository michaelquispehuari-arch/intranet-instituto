"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api-error";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { CourseOption } from "../types";

type UploadFormProps = {
  courses: CourseOption[];
  selectedCourseId?: string;
};

export function UploadForm({ courses, selectedCourseId }: UploadFormProps) {
  const { t } = useTranslation();
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
          t("material.subir.uploadError"),
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
        <label htmlFor="cursoId">{t("material.subir.courseLabel")}</label>
        <select id="cursoId" name="cursoId" defaultValue={selectedCourseId ?? ""} required>
          <option value="">{t("material.subir.selectCourse")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {t("material.subir.courseOption", { ciclo: c.ciclo, anio: c.anio })}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="nombre">{t("material.subir.nameLabel")}</label>
        <input id="nombre" name="nombre" minLength={3} maxLength={150} required />
      </div>

      <div className="field">
        <label htmlFor="files">{t("material.subir.filesLabel")}</label>
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
        <label htmlFor="descripcion">{t("material.subir.descriptionLabel")}</label>
        <textarea id="descripcion" name="descripcion" maxLength={500} rows={3} />
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--desaprobado-texto)" }}>{error}</p>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? t("material.subir.submitting") : t("material.subir.submitButton")}
        </button>
      </div>
    </form>
  );
}
