"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { CourseOption } from "../types";
import { UploadForm } from "./upload-form";

type SubirContentProps = {
  courses: CourseOption[];
  selectedCourseId: string;
};

export function SubirContent({ courses, selectedCourseId }: SubirContentProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="page-header">
        <Link href="/material" style={{ fontSize: 13, color: "var(--texto-tenue)", display: "inline-block", marginBottom: 8 }}>
          ← {t("material.backToMaterial")}
        </Link>
        <span className="page-eyebrow">{t("material.eyebrow")}</span>
        <h1 className="page-title">{t("material.subir.title")}</h1>
        <p className="page-subtitle">{t("material.subir.subtitle")}</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <UploadForm courses={courses} selectedCourseId={selectedCourseId} />
        </div>
      </div>
    </div>
  );
}
