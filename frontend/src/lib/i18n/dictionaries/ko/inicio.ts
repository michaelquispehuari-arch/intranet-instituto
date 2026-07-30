import type { Dictionary } from "../es";

export const inicio: Dictionary["inicio"] = {
  greeting: "안녕하세요, {{nombre}}님",
  admin: {
    eyebrow: "관리",
    description: "학사 일정 관리 패널입니다.",
    activeCourses: "진행 중인 과정",
    totalCourses: "전체 과정",
    zoomConfigured: "설정됨",
    zoomNotConfigured: "설정되지 않음",
    quickAccess: "바로가기",
    itemDesc: {
      cursos: "과정과 수업 관리",
      calificaciones: "학생별 성적 타임라인",
      examenes: "시험 생성 및 검토",
      estudiantes: "학생 등록 및 계정 관리",
      profesores: "교수 등록 및 계정 관리",
      sustitutorios: "응시 가능 학생 목록",
      configuracion: "Zoom 및 전체 설정",
    },
  },
  profesor: {
    eyebrow: "교수",
    description: "이번 주 수업입니다.",
  },
  estudiante: {
    eyebrow: "학생",
    description: "이번 주 진행 중인 과정입니다.",
  },
  joinClass: "지금 수업 참여하기",
  activeCourseChip: "진행 중인 과정",
  defaultCourseDesc: "과정의 수업, 자료, 시험을 확인하세요.",
  profTag: "{{nombre}} {{apellido}} 교수",
  viewMyCourses: "내 과정 보기 ({{count}})",
  noCourseProfesor: {
    title: "아직 배정된 과정이 없습니다.",
    description: "관리자가 곧 과정을 배정할 예정입니다.",
  },
  noCourseEstudiante: {
    title: "아직 등록된 과정이 없습니다.",
    description: "관리자가 곧 과정에 등록할 예정입니다.",
  },
};
