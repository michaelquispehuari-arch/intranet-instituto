import type { Dictionary } from "../es";

export const calificaciones: Dictionary["calificaciones"] = {
  estudiante: {
    eyebrow: "내 결과",
    title: "내 성적",
    subtitle: "관리자가 게시한 성적입니다",
    noEnrollmentsTitle: "등록된 과정 없음",
    noEnrollmentsDesc: "진행 중인 과정에 등록되어 있지 않습니다.",
  },
  admin: {
    eyebrow: "학사",
    title: "성적 타임라인",
    subtitle: "전체 보기: 학생별 합격 및 불합격 현황",
    noDataTitle: "성적 데이터 없음",
    noDataDesc: "등록된 과정이나 수강 신청이 아직 없습니다.",
    student: "학생",
    approvedCount: "합격",
  },
  course: "과정",
  finalGrade: "최종 성적",
  cycle: "{{ciclo}}차 — {{anio}}",
  notPublished: "아직 게시되지 않음",
  chip: {
    enCurso: "진행 중",
    sinNota: "성적 없음",
    aprobado: "합격",
    desaprobado: "불합격",
    enCursoSinNota: "진행 중 / 성적 없음",
  },
};
