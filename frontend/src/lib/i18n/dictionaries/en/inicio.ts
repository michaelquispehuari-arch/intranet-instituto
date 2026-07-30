import type { Dictionary } from "../es";

export const inicio: Dictionary["inicio"] = {
  greeting: "Hello, {{nombre}}",
  admin: {
    eyebrow: "Administration",
    description: "Control panel for the academic term.",
    activeCourses: "Active courses",
    totalCourses: "Total courses",
    zoomConfigured: "Configured",
    zoomNotConfigured: "Not configured",
    quickAccess: "Quick access",
    itemDesc: {
      cursos: "Manage courses and sessions",
      calificaciones: "Grade timeline by student",
      examenes: "Create and review exams",
      estudiantes: "Student records and accounts",
      profesores: "Teacher records and accounts",
      sustitutorios: "Eligible students",
      configuracion: "Zoom and global settings",
    },
  },
  profesor: {
    eyebrow: "Teacher",
    description: "Your class this week.",
  },
  estudiante: {
    eyebrow: "Student",
    description: "Your active course this week.",
  },
  joinClass: "Join class now",
  activeCourseChip: "Active course",
  defaultCourseDesc: "View sessions, materials and exams for this course.",
  profTag: "Prof. {{nombre}} {{apellido}}",
  viewMyCourses: "View my courses ({{count}})",
  noCourseProfesor: {
    title: "You don't have a course assigned yet.",
    description: "The administrator will assign your course soon.",
  },
  noCourseEstudiante: {
    title: "You are not enrolled in a course yet.",
    description: "The administrator will enroll you in a course soon.",
  },
};
