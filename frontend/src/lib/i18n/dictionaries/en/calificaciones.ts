import type { Dictionary } from "../es";

export const calificaciones: Dictionary["calificaciones"] = {
  estudiante: {
    eyebrow: "My results",
    title: "My grades",
    subtitle: "Grades published by the administrator",
    noEnrollmentsTitle: "No enrollments",
    noEnrollmentsDesc: "You are not enrolled in any active course.",
  },
  admin: {
    eyebrow: "Academics",
    title: "Grade timeline",
    subtitle: "Overall view: passed and failed by student",
    noDataTitle: "No grade data",
    noDataDesc: "There are no courses or enrollments registered yet.",
    student: "Student",
    approvedCount: "Passed",
  },
  course: "Course",
  finalGrade: "Final grade",
  cycle: "Cycle {{ciclo}} — {{anio}}",
  notPublished: "Not published yet",
  chip: {
    enCurso: "In progress",
    sinNota: "No grade",
    aprobado: "Passed",
    desaprobado: "Failed",
    enCursoSinNota: "In progress / no grade",
  },
};
