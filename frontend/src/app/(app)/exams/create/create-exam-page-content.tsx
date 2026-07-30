"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { CourseOption } from "../types";
import { CreateExamForm } from "./create-exam-form";

type CreateExamPageContentProps = {
  role: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  courses: CourseOption[];
};

export function CreateExamPageContent({ role, courses }: CreateExamPageContentProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link href="/exams" style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
          {t("exams.backToExamsLink")}
        </Link>
      </div>
      <div className="page-header">
        <span className="page-eyebrow">{t(`common.role.${role}`)}</span>
        <h1 className="page-title">{t("exams.newExamTitle")}</h1>
        <p className="page-subtitle">{t("exams.createPageSubtitle")}</p>
      </div>

      <CreateExamForm courses={courses} />
    </div>
  );
}
