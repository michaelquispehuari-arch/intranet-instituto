"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { INTL_LOCALES } from "@/lib/i18n/types";
import type { ExamListItem } from "./types";

type ExamAvailability = "draft" | "future" | "expired" | "available";

function getExamAvailability(exam: ExamListItem): ExamAvailability {
  const now = new Date();

  if (!exam.publicadoEn) return "draft";
  if (exam.disponibleDesde && new Date(exam.disponibleDesde) > now) return "future";
  if (exam.disponibleDesde) {
    const cierre = new Date(new Date(exam.disponibleDesde).getTime() + exam.duracionMinutos * 60_000);
    if (cierre < now) return "expired";
  }
  return "available";
}

function canOpenExam(exam: ExamListItem, role: string) {
  if (role !== "ESTUDIANTE") return true;
  return getExamAvailability(exam) === "available";
}

type ExamState = "draft" | "expired" | "ongoing" | "pending";

function getExamStateChip(exam: ExamListItem): { state: ExamState; chipClass: string } {
  const now = new Date();
  const desde = exam.disponibleDesde ? new Date(exam.disponibleDesde) : null;
  const cierre = desde ? new Date(desde.getTime() + exam.duracionMinutos * 60_000) : null;
  const disponible = Boolean(exam.publicadoEn) && desde !== null && desde <= now && cierre !== null && cierre > now;
  const vencido = cierre !== null && cierre < now;

  if (!exam.publicadoEn) return { state: "draft", chipClass: "chip-capturas" };
  if (vencido) return { state: "expired", chipClass: "chip-resumen" };
  if (disponible) return { state: "ongoing", chipClass: "chip-ok" };
  return { state: "pending", chipClass: "chip-capturas" };
}

type ExamsContentProps = {
  role: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  canManageExams: boolean;
  exams: ExamListItem[] | null;
  loadError: string | null;
  publishExam: (formData: FormData) => Promise<void>;
};

export function ExamsContent({ role, canManageExams, exams, loadError, publishExam }: ExamsContentProps) {
  const { t, locale } = useTranslation();

  if (loadError !== null) {
    return (
      <div className="card">
        <div className="empty-state">
          <p className="empty-state-title">{t("exams.loadErrorTitle")}</p>
          <p style={{ color: "var(--texto-tenue)" }}>{loadError || t("exams.loadErrorFallback")}</p>
        </div>
      </div>
    );
  }

  const examList = exams ?? [];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="page-eyebrow">{t(`common.role.${role}`)}</span>
          <h1 className="page-title">{t("exams.title")}</h1>
          <p className="page-subtitle">
            {canManageExams ? t("exams.subtitleManage") : t("exams.subtitleTake")}
          </p>
        </div>
        {canManageExams ? (
          <Link className="btn btn-primary" href="/exams/create">
            {t("exams.newExam")}
          </Link>
        ) : null}
      </div>

      {examList.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-title">{t("exams.emptyTitle")}</p>
            <p>{canManageExams ? t("exams.emptyDescManage") : t("exams.emptyDescTake")}</p>
          </div>
        </div>
      ) : (
        <div className="session-list" aria-label={t("exams.listAriaLabel")}>
          {examList.map((exam) => {
            const estado = getExamStateChip(exam);
            const desde = exam.disponibleDesde ? new Date(exam.disponibleDesde) : null;
            const cierre = desde ? new Date(desde.getTime() + exam.duracionMinutos * 60_000) : null;
            return (
              <article className="session-card" style={{ cursor: "default" }} key={exam.id}>
                <div className="session-info">
                  <div className="session-title">{exam.titulo}</div>
                  <div style={{ fontSize: 13, color: "var(--texto-tenue)", marginTop: 4 }}>
                    {exam.curso.nombre} · {t("exams.durationAndQuestions", { minutos: exam.duracionMinutos, preguntas: exam._count.preguntas })}
                    {desde && ` · ${t("exams.startAt", { fecha: desde.toLocaleString(INTL_LOCALES[locale], { timeZone: "America/Lima" }) })}`}
                    {cierre && ` · ${t("exams.closesAt", { fecha: cierre.toLocaleString(INTL_LOCALES[locale], { timeZone: "America/Lima" }) })}`}
                  </div>
                  <div className="session-chips" style={{ marginTop: 6 }}>
                    <span className={`chip ${estado.chipClass}`}>{t(`exams.state.${estado.state}`)}</span>
                    {exam._count.envios > 0 && (
                      <span className="chip chip-grabacion">{t("exams.submissionsCount", { count: exam._count.envios })}</span>
                    )}
                  </div>
                  {exam.descripcion && (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--texto-secundario)" }}>{exam.descripcion}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  {canOpenExam(exam, role) ? (
                    <Link className="btn btn-primary" style={{ fontSize: 13 }} href={`/exams/${exam.id}`}>
                      {role === "ESTUDIANTE" ? t("exams.takeExam") : t("exams.openExam")}
                    </Link>
                  ) : (
                    <span className="btn btn-secondary" style={{ fontSize: 13, opacity: 0.5, cursor: "not-allowed" }} aria-disabled="true">
                      {t("exams.notAvailable")}
                    </span>
                  )}
                  {exam._count.envios > 0 || role !== "ESTUDIANTE" ? (
                    <Link className="btn btn-secondary" style={{ fontSize: 13 }} href={`/exams/${exam.id}/results`}>
                      {t("exams.results")}
                    </Link>
                  ) : null}
                  {canManageExams && !exam.publicadoEn ? (
                    <form action={publishExam}>
                      <input name="examId" type="hidden" value={exam.id} />
                      <button className="btn btn-primary" style={{ fontSize: 13 }} type="submit">
                        {t("exams.publish")}
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
