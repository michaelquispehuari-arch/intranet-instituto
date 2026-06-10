import { Rol } from "@prisma/client";
import type {
  AttendanceQuery,
  CreateManualGradeInput,
  GradeQuery,
  UpdateManualGradeInput,
  UpdateGradeConfigInput,
  UpsertAttendanceInput,
} from "../schemas/grade.schema.js";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, HttpError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";

const defaultGradeConfig = {
  pesoExamenes: 0.7,
  pesoNotasManuales: 0.3,
  notaAprobatoria: 11,
};

export async function listGradeSummaries(query: GradeQuery, user: AuthUser) {
  const estudianteId = getVisibleStudentId(query.estudianteId, user);

  const courses = await prisma.curso.findMany({
    where: buildCourseAccessWhere(query.cursoId, user),
    include: {
      config: true,
      inscripciones: {
        where: estudianteId ? { estudianteId } : undefined,
        include: {
          estudiante: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      },
      notasManuales: estudianteId
        ? { where: { estudianteId } }
        : true,
      examenes: {
        include: {
          preguntas: {
            select: {
              puntaje: true,
            },
          },
          envios: {
            where: {
              completado: true,
              ...(estudianteId ? { estudianteId } : {}),
            },
            select: {
              estudianteId: true,
              puntajeTotal: true,
              examenId: true,
            },
          },
        },
      },
    },
    orderBy: [{ anio: "desc" }, { ciclo: "asc" }, { nombre: "asc" }],
  });

  return courses.flatMap((course) => {
    const config = course.config ?? {
      pesoExamenes: 0.7,
      pesoNotasManuales: 0.3,
      notaAprobatoria: 11,
    };

    return course.inscripciones.map((inscripcion) => {
      const manualGrades = course.notasManuales.filter(
        (grade) => grade.estudianteId === inscripcion.estudianteId,
      );
      const examGrades = course.examenes.flatMap((exam) => {
        const maxScore = exam.preguntas.reduce((sum, question) => sum + question.puntaje, 0);

        if (maxScore <= 0) {
          return [];
        }

        return exam.envios
          .filter((submission) => submission.estudianteId === inscripcion.estudianteId)
          .map((submission) => ((submission.puntajeTotal ?? 0) / maxScore) * 20);
      });

      const promedioExamenes = average(examGrades);
      const promedioNotasManuales = average(manualGrades.map((grade) => grade.valor));
      const promedioFinal = calculateFinalAverage(
        promedioExamenes,
        promedioNotasManuales,
        config.pesoExamenes,
        config.pesoNotasManuales,
      );

      return {
        curso: {
          id: course.id,
          nombre: course.nombre,
          ciclo: course.ciclo,
          anio: course.anio,
        },
        estudiante: inscripcion.estudiante,
        promedioExamenes,
        promedioNotasManuales,
        promedioFinal,
        aprobado: promedioFinal === null ? null : promedioFinal >= config.notaAprobatoria,
        notaAprobatoria: config.notaAprobatoria,
      };
    });
  });
}

export async function createManualGrade(input: CreateManualGradeInput, user: AuthUser) {
  await ensureProfessorCanGrade(input.cursoId, input.estudianteId, user.id);

  return prisma.notaManual.create({
    data: {
      estudianteId: input.estudianteId,
      cursoId: input.cursoId,
      profesorId: user.id,
      valor: input.valor,
      descripcion: input.descripcion,
      fecha: input.fecha,
    },
  });
}

export async function updateManualGrade(gradeId: string, input: UpdateManualGradeInput, user: AuthUser) {
  const grade = await prisma.notaManual.findUnique({
    where: { id: gradeId },
    select: { profesorId: true },
  });

  if (!grade) {
    throw new NotFoundError("Nota manual no encontrada");
  }

  if (grade.profesorId !== user.id) {
    throw new ForbiddenError();
  }

  return prisma.notaManual.update({
    where: { id: gradeId },
    data: input,
  });
}

export async function deleteManualGrade(gradeId: string, user: AuthUser) {
  const grade = await prisma.notaManual.findUnique({
    where: { id: gradeId },
    select: { profesorId: true },
  });

  if (!grade) {
    throw new NotFoundError("Nota manual no encontrada");
  }

  if (grade.profesorId !== user.id) {
    throw new ForbiddenError();
  }

  return prisma.notaManual.delete({
    where: { id: gradeId },
  });
}

export async function listAttendance(query: AttendanceQuery, user: AuthUser) {
  const estudianteId = getVisibleStudentId(query.estudianteId, user);

  return prisma.asistencia.findMany({
    where: {
      ...(query.cursoId ? { cursoId: query.cursoId } : {}),
      ...(estudianteId ? { estudianteId } : {}),
      curso: buildCourseAccessWhere(query.cursoId, user),
    },
    include: {
      estudiante: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
      curso: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
    orderBy: { fecha: "desc" },
  });
}

export async function upsertAttendance(input: UpsertAttendanceInput, user: AuthUser) {
  const fecha = normalizeDate(input.fecha);
  await ensureProfessorCanGrade(input.cursoId, input.estudianteId, user.id);

  return prisma.asistencia.upsert({
    where: {
      estudianteId_cursoId_fecha: {
        estudianteId: input.estudianteId,
        cursoId: input.cursoId,
        fecha,
      },
    },
    update: {
      estado: input.estado,
    },
    create: {
      estudianteId: input.estudianteId,
      cursoId: input.cursoId,
      fecha,
      estado: input.estado,
    },
  });
}

export async function getGradeConfig(courseId: string) {
  await ensureCourseExists(courseId);

  const config = await prisma.configCurso.findUnique({
    where: { cursoId: courseId },
  });

  return config ?? { cursoId: courseId, ...defaultGradeConfig };
}

export async function updateGradeConfig(courseId: string, input: UpdateGradeConfigInput) {
  await ensureCourseExists(courseId);

  const currentConfig = await prisma.configCurso.findUnique({
    where: { cursoId: courseId },
  });
  const nextConfig = {
    pesoExamenes: input.pesoExamenes ?? currentConfig?.pesoExamenes ?? defaultGradeConfig.pesoExamenes,
    pesoNotasManuales:
      input.pesoNotasManuales ??
      currentConfig?.pesoNotasManuales ??
      defaultGradeConfig.pesoNotasManuales,
    notaAprobatoria:
      input.notaAprobatoria ?? currentConfig?.notaAprobatoria ?? defaultGradeConfig.notaAprobatoria,
  };

  if (Math.abs(nextConfig.pesoExamenes + nextConfig.pesoNotasManuales - 1) > 0.0001) {
    throw new HttpError(400, "Los pesos de calificacion deben sumar 1");
  }

  return prisma.configCurso.upsert({
    where: { cursoId: courseId },
    update: nextConfig,
    create: {
      cursoId: courseId,
      ...nextConfig,
    },
  });
}

function getVisibleStudentId(studentId: string | undefined, user: AuthUser) {
  return user.rol === Rol.ESTUDIANTE ? user.id : studentId;
}

function buildCourseAccessWhere(courseId: string | undefined, user: AuthUser) {
  return {
    ...(courseId ? { id: courseId } : {}),
    ...(user.rol === Rol.PROFESOR ? { profesorId: user.id, activo: true } : {}),
    ...(user.rol === Rol.ESTUDIANTE
      ? {
          activo: true,
          inscripciones: {
            some: {
              estudianteId: user.id,
            },
          },
        }
      : {}),
  };
}

async function ensureProfessorCanGrade(courseId: string, studentId: string, professorId: string) {
  const enrollment = await prisma.inscripcion.findFirst({
    where: {
      estudianteId: studentId,
      cursoId: courseId,
      curso: {
        profesorId: professorId,
        activo: true,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new ForbiddenError("Estudiante no inscrito en un curso del profesor");
  }
}

async function ensureCourseExists(courseId: string) {
  const course = await prisma.curso.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Curso no encontrado");
  }
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function calculateFinalAverage(
  examAverage: number | null,
  manualAverage: number | null,
  examWeight: number,
  manualWeight: number,
) {
  if (examAverage === null && manualAverage === null) {
    return null;
  }

  if (examAverage === null) {
    return manualAverage;
  }

  if (manualAverage === null) {
    return examAverage;
  }

  return round2(examAverage * examWeight + manualAverage * manualWeight);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
