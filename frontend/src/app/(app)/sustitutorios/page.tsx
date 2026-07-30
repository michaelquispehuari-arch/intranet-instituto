"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ExamListItem, ExamResults } from "../exams/types";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { INTL_LOCALES } from "@/lib/i18n/types";

type EligibleStudent = {
  estudianteId: string;
  estudiante: { id: string; nombre: string; apellido: string; email: string };
  count: number;
};

type GradeState = Record<string, string>; // answerId -> grade string

function formatNote(v: number | null) {
  return v === null ? "–" : v.toFixed(2);
}

function allAnswersGraded(submission: ExamResults["submissions"][0]) {
  return submission.respuestas.every((r) => r.estadoCalificacion !== "PENDIENTE");
}

export default function SustitutoriosPage() {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState<"examenes" | "alumnos">("examenes");
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [eligible, setEligible] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedExam, setSelectedExam] = useState<ExamListItem | null>(null);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // grades: submissionId -> { answerId -> value }
  const [grades, setGrades] = useState<Record<string, GradeState>>({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/backend/exams").then((r) => r.json()),
      fetch("/api/backend/substitutions/eligible").then((r) => r.json()),
    ]).then(([examData, eligData]) => {
      const all: ExamListItem[] = examData?.exams ?? [];
      setExams(all.filter((e) => e.esSustitutorio));
      setEligible(Array.isArray(eligData) ? eligData : []);
      setLoading(false);
    });
  }, []);

  async function openExam(exam: ExamListItem) {
    setSelectedExam(exam);
    setResults(null);
    setLoadingResults(true);
    setFeedback({});
    const res = await fetch(`/api/backend/exams/${exam.id}/results`);
    if (res.ok) {
      const data: ExamResults = await res.json();
      setResults(data);
      // Init grade inputs from existing puntajeObtenido for already-graded answers
      const init: Record<string, GradeState> = {};
      for (const sub of data.submissions) {
        init[sub.id] = {};
        for (const r of sub.respuestas) {
          init[sub.id][r.id] = r.estadoCalificacion !== "AUTO" ? String(r.puntajeObtenido) : "";
        }
      }
      setGrades(init);
    }
    setLoadingResults(false);
  }

  function setGrade(submissionId: string, answerId: string, value: string) {
    setGrades((prev) => ({
      ...prev,
      [submissionId]: { ...(prev[submissionId] ?? {}), [answerId]: value },
    }));
  }

  async function saveGrades(submissionId: string) {
    if (!selectedExam) return;
    const submission = results?.submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    const calificaciones = submission.respuestas.map((r) => ({
      respuestaId: r.id,
      puntajeManual: parseFloat(grades[submissionId]?.[r.id] ?? "0") || 0,
    }));

    setSavingGrades((p) => ({ ...p, [submissionId]: true }));
    const res = await fetch(`/api/backend/exams/${selectedExam.id}/grade-open`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificaciones }),
    });
    setSavingGrades((p) => ({ ...p, [submissionId]: false }));

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: t("sustitutorios.errors.saveGrade") }));
      setFeedback((p) => ({ ...p, [submissionId]: err.message ?? t("sustitutorios.errors.saveGrade") }));
      return;
    }
    setFeedback((p) => ({ ...p, [submissionId]: t("sustitutorios.gradeSaved") }));
    // Refresh results
    await openExam(selectedExam);
  }

  async function markReviewed(submissionId: string) {
    if (!selectedExam) return;
    setReviewingId(submissionId);
    const res = await fetch(
      `/api/backend/exams/${selectedExam.id}/submissions/${submissionId}/review`,
      { method: "PATCH" },
    );
    setReviewingId(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: t("sustitutorios.errors.markReviewed") }));
      setFeedback((p) => ({
        ...p,
        [submissionId]: err.message ?? t("sustitutorios.errors.markReviewed"),
      }));
      return;
    }
    const data = await res.json();
    setFeedback((p) => ({
      ...p,
      [submissionId]: t("sustitutorios.reviewedSuccess", { nota: data.notaExamenRecup }),
    }));
    await openExam(selectedExam);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 20px",
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--amber-action, #BE7A12)" : "2px solid transparent",
    fontSize: 14,
    color: active ? "var(--texto-principal, #1C2522)" : "var(--texto-tenue, #8A8E89)",
  });

  return (
    <div>
      <div className="page-header">
        <span className="page-eyebrow">{t("sustitutorios.eyebrow")}</span>
        <h1 className="page-title">{t("sustitutorios.title")}</h1>
        <p className="page-subtitle">{t("sustitutorios.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--borde)", marginBottom: 24 }}>
        <button style={tabStyle(tab === "examenes")} onClick={() => setTab("examenes")}>
          {t("sustitutorios.tabs.exams")}
        </button>
        <button style={tabStyle(tab === "alumnos")} onClick={() => setTab("alumnos")}>
          {t("sustitutorios.tabs.eligibleStudents")}
        </button>
      </div>

      {/* TAB: EXÁMENES */}
      {tab === "examenes" && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Lista de exámenes sustitutorios */}
          <div style={{ flex: "0 0 320px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                {loading ? t("sustitutorios.loading") : t("sustitutorios.examCount", { count: exams.length })}
              </h2>
              <Link href="/exams/create" className="btn btn-secondary" style={{ fontSize: 12 }}>
                {t("sustitutorios.createButton")}
              </Link>
            </div>

            {!loading && exams.length === 0 && (
              <div className="card empty-state" style={{ padding: "20px 16px" }}>
                <p className="empty-state-title">{t("sustitutorios.noExams.title")}</p>
                <p style={{ fontSize: 13 }}>
                  {t("sustitutorios.noExams.description")}
                </p>
              </div>
            )}

            <div className="stack" style={{ gap: 8 }}>
              {exams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => openExam(exam)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    background: selectedExam?.id === exam.id ? "var(--superficie, #fff)" : "transparent",
                    border: selectedExam?.id === exam.id
                      ? "1px solid var(--amber-action, #BE7A12)"
                      : "1px solid var(--borde, #E7E5DE)",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{exam.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--texto-tenue)", marginTop: 2 }}>
                    {exam.curso.nombre} · {exam._count.envios} envío(s)
                  </div>
                  {!exam.publicadoEn && (
                    <span style={{ fontSize: 11, color: "var(--amber-action, #BE7A12)" }}>{t("sustitutorios.notPublished")}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Panel de envíos */}
          <div style={{ flex: 1 }}>
            {!selectedExam && (
              <div className="card empty-state">
                <p className="empty-state-title">{t("sustitutorios.selectExam.title")}</p>
                <p style={{ fontSize: 13 }}>{t("sustitutorios.selectExam.description")}</p>
              </div>
            )}

            {selectedExam && loadingResults && (
              <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "var(--texto-tenue)" }}>{t("sustitutorios.loadingSubmissions")}</p>
              </div>
            )}

            {selectedExam && !loadingResults && results && (
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
                  {selectedExam.titulo} {t("sustitutorios.submissionsCount", { count: results.submissions.length })}
                </h2>

                {results.submissions.length === 0 && (
                  <div className="card empty-state">
                    <p>{t("sustitutorios.noSubmissions")}</p>
                  </div>
                )}

                <div className="stack" style={{ gap: 16 }}>
                  {results.submissions.map((sub) => {
                    const allGraded = allAnswersGraded(sub);
                    const subFeedback = feedback[sub.id];
                    return (
                      <div key={sub.id} className="card" style={{ padding: 20 }}>
                        {/* Cabecera alumno */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {sub.estudiante.nombre} {sub.estudiante.apellido}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                              {sub.estudiante.email}
                            </div>
                            {sub.enviadoEn && (
                              <div style={{ fontSize: 12, color: "var(--texto-tenue)", marginTop: 2 }}>
                                {t("sustitutorios.submittedAt")}{" "}
                                {new Intl.DateTimeFormat(INTL_LOCALES[locale], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                  timeZone: "America/Lima",
                                }).format(new Date(sub.enviadoEn))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {allGraded && (
                              <span style={{ fontSize: 12, color: "var(--estado-aprobado-texto, #2C6A48)" }}>
                                {t("sustitutorios.allGraded")}
                              </span>
                            )}
                            <span className="badge">
                              {t("sustitutorios.pointsLabel", { value: formatNote(sub.puntajeTotal) })}
                            </span>
                          </div>
                        </div>

                        {/* Respuestas con inputs de calificación */}
                        <div className="stack compact-stack" style={{ marginBottom: 16 }}>
                          {sub.respuestas.map((answer) => (
                            <div
                              key={answer.id}
                              style={{
                                padding: "10px 14px",
                                background: "var(--fondo, #F6F7F5)",
                                borderRadius: 8,
                                borderLeft: answer.estadoCalificacion === "CALIFICADA"
                                  ? "3px solid var(--estado-aprobado-texto, #2C6A48)"
                                  : "3px solid var(--borde, #E7E5DE)",
                              }}
                            >
                              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                                {answer.pregunta.texto}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--texto-secundario)",
                                  marginBottom: 8,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {answer.respuesta}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                  {t("sustitutorios.gradeLabel", { max: answer.pregunta.puntaje })}
                                  <input
                                    type="number"
                                    min={0}
                                    max={answer.pregunta.puntaje}
                                    step={0.5}
                                    value={grades[sub.id]?.[answer.id] ?? ""}
                                    onChange={(e) => setGrade(sub.id, answer.id, e.target.value)}
                                    style={{
                                      width: 70,
                                      padding: "4px 8px",
                                      border: "1px solid var(--borde)",
                                      borderRadius: 6,
                                      fontSize: 13,
                                    }}
                                  />
                                </label>
                                {answer.estadoCalificacion === "CALIFICADA" && (
                                  <span style={{ fontSize: 12, color: "var(--estado-aprobado-texto, #2C6A48)" }}>
                                    {t("sustitutorios.savedLabel", { value: answer.puntajeObtenido })}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Acciones */}
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => saveGrades(sub.id)}
                            disabled={savingGrades[sub.id]}
                          >
                            {savingGrades[sub.id] ? t("sustitutorios.saving") : t("sustitutorios.saveGrade")}
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => markReviewed(sub.id)}
                            disabled={!allGraded || reviewingId === sub.id}
                            title={!allGraded ? t("sustitutorios.gradeAllFirst") : ""}
                          >
                            {reviewingId === sub.id ? t("sustitutorios.reviewing") : t("sustitutorios.markReviewed")}
                          </button>
                          {subFeedback && (
                            <span
                              style={{
                                fontSize: 13,
                                color: subFeedback.includes("✓")
                                  ? "var(--estado-aprobado-texto, #2C6A48)"
                                  : "var(--estado-desaprobado-texto, #B5482F)",
                              }}
                            >
                              {subFeedback}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ALUMNOS ELEGIBLES */}
      {tab === "alumnos" && (
        <div className="card">
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {t("sustitutorios.eligibleStudentsHeading", { count: loading ? "…" : eligible.length })}
            </h2>
          </div>
          <div className="card-body">
            {loading && <p style={{ color: "var(--texto-tenue)", margin: 0 }}>{t("sustitutorios.loading")}</p>}

            {!loading && eligible.length === 0 && (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-state-icon">✅</div>
                <p className="empty-state-title">{t("sustitutorios.noEligible.title")}</p>
                <p>{t("sustitutorios.noEligible.description")}</p>
              </div>
            )}

            {eligible.map((item) => (
              <div
                key={item.estudianteId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "0.5px solid var(--borde)",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {item.estudiante.nombre} {item.estudiante.apellido}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--texto-tenue)" }}>
                    {item.estudiante.email}
                  </div>
                </div>
                <span className="badge-desaprobado">
                  {t(item.count === 1 ? "sustitutorios.courseFailedSingular" : "sustitutorios.courseFailedPlural", { count: item.count })}
                </span>
              </div>
            ))}

            {!loading && eligible.length > 0 && (
              <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--texto-tenue)" }}>
                {t("sustitutorios.manualEnableIntro")}{" "}
                <code>POST /api/substitutions</code> {t("sustitutorios.manualEnableWith")} <code>estudianteId</code>{" "}
                {t("sustitutorios.manualEnableAnd")} <code>cursoId</code>.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
