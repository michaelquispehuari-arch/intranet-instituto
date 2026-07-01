import { Rol } from "@prisma/client";
import type {
  AttendanceGradeQuery,
  CreateManualGradeInput,
  GradeQuery,
  UpdateManualGradeInput,
  UpdateGradeConfigInput,
  SetAttendanceGradeInput,
} from "../schemas/grade.schema.js";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, HttpError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";

const defaultGradeConfig = {
  pesoAsistencia: 0.5,
  pesoAcademico: 0.5,
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
            select: { id: true, nombre: true, apellido: true, email: true },
          },
        },
      },
      notasManuales: estudianteId ? { where: { estudianteId } } : true,
      examenes: {
        include: {
          preguntas: { select: { puntaje: true } },
          envios: {
            where: {
              completado: true,
              ...(estudianteId ? { estudianteId } : {}),
            },
            select: { estudianteId: true, puntajeTotal: true, examenId: true },
          },
        },
      },
    },
    orderBy: [{ anio: "desc" }, { ciclo: "asc" }, { nombre: "asc" }],
  });

  return courses.flatMap((course) => {
    const config = course.config ?? defaultGradeConfig;

    return course.inscripciones.map((inscripcion) => {
      const manualGrades = course.notasManuales.filter(
        (grade) => grade.estudianteId === inscripcion.estudianteId,
      );
      const examGrades = course.examenes.flatMap((exam) => {
        const maxScore = exam.preguntas.reduce((sum, q) => sum + q.puntaje, 0);
        if (maxScore <= 0) return [];
        return exam.envios
          .filter((e) => e.estudianteId === inscripcion.estudianteId)
          .map((e) => ((e.puntajeTotal ?? 0) / maxScore) * 20);
      });

      const promedioAcademico = average([
        ...examGrades,
        ...manualGrades.map((g) => g.valor),
      ]);
      const notaAsistencia = inscripcion.notaAsistencia;

      const promedioFinal = calculateFinalGrade(
        notaAsistencia,
        promedioAcademico,
        config.pesoAsistencia,
        config.pesoAcademico,
      );

      return {
        curso: { id: course.id, nombre: course.nombre, ciclo: course.ciclo, anio: course.anio },
        estudiante: inscripcion.estudiante,
        notaAsistencia,
        promedioAcademico,
        promedioFinal,
        aprobado: promedioFinal === null ? null : promedioFinal >= config.notaAprobatoria,
        notaAprobatoria: config.notaAprobatoria,
      };
    });
  });
}

export async function getTimeline(user: AuthUser) {
  const courses = await prisma.curso.findMany({
    where: buildCourseAccessWhere(undefined, user),
    include: {
      inscripciones: {
        where: user.rol === Rol.ESTUDIANTE ? { estudianteId: user.id } : undefined,
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      },
      registrosSemanal: {
        select: { estudianteId: true, notaFinal: true },
      },
    },
    orderBy: [{ anio: "desc" }, { ciclo: "asc" }],
  });

  const studentMap = new Map<string, { estudiante: object; semanas: object[] }>();

  for (const course of courses) {
    const regMap = new Map(course.registrosSemanal.map((r) => [r.estudianteId, r]));

    for (const inscripcion of course.inscripciones) {
      const { estudianteId, estudiante } = inscripcion;
      const registro = regMap.get(estudianteId);
      const notaFinal = registro?.notaFinal ?? null;
      const aprobado = notaFinal === null ? null : notaFinal >= 11;

      if (!studentMap.has(estudianteId)) {
        studentMap.set(estudianteId, { estudiante, semanas: [] });
      }
      studentMap.get(estudianteId)!.semanas.push({
        curso: { id: course.id, nombre: course.nombre, ciclo: course.ciclo, anio: course.anio },
        notaFinal,
        aprobado,
        estado: course.activo ? "en_curso" : "cerrado",
      });
    }
  }

  return [...studentMap.values()];
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

  if (!grade) throw new NotFoundError("Nota manual no encontrada");
  if (grade.profesorId !== user.id) throw new ForbiddenError();

  return prisma.notaManual.update({ where: { id: gradeId }, data: input });
}

export async function deleteManualGrade(gradeId: string, user: AuthUser) {
  const grade = await prisma.notaManual.findUnique({
    where: { id: gradeId },
    select: { profesorId: true },
  });

  if (!grade) throw new NotFoundError("Nota manual no encontrada");
  if (grade.profesorId !== user.id) throw new ForbiddenError();

  return prisma.notaManual.delete({ where: { id: gradeId } });
}

export async function listAttendanceGrades(query: AttendanceGradeQuery, user: AuthUser) {
  const estudianteId = getVisibleStudentId(query.estudianteId, user);

  const inscriptions = await prisma.inscripcion.findMany({
    where: {
      ...(query.cursoId ? { cursoId: query.cursoId } : {}),
      ...(estudianteId ? { estudianteId } : {}),
      curso: buildCourseAccessWhere(query.cursoId, user),
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
      curso: { select: { id: true, nombre: true } },
    },
  });

  return inscriptions.map((i) => ({
    estudianteId: i.estudianteId,
    cursoId: i.cursoId,
    notaAsistencia: i.notaAsistencia,
    estudiante: i.estudiante,
    curso: i.curso,
  }));
}

export async function setAttendanceGrade(input: SetAttendanceGradeInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError("Solo el admin puede ingresar la nota de asistencia");
  }

  const inscription = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_cursoId: {
        estudianteId: input.estudianteId,
        cursoId: input.cursoId,
      },
    },
    select: { id: true },
  });

  if (!inscription) {
    throw new NotFoundError("Inscripcion no encontrada");
  }

  return prisma.inscripcion.update({
    where: {
      estudianteId_cursoId: {
        estudianteId: input.estudianteId,
        cursoId: input.cursoId,
      },
    },
    data: { notaAsistencia: input.notaAsistencia },
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
    pesoAsistencia: input.pesoAsistencia ?? currentConfig?.pesoAsistencia ?? defaultGradeConfig.pesoAsistencia,
    pesoAcademico: input.pesoAcademico ?? currentConfig?.pesoAcademico ?? defaultGradeConfig.pesoAcademico,
    notaAprobatoria: input.notaAprobatoria ?? currentConfig?.notaAprobatoria ?? defaultGradeConfig.notaAprobatoria,
  };

  if (Math.abs(nextConfig.pesoAsistencia + nextConfig.pesoAcademico - 1) > 0.0001) {
    throw new HttpError(400, "Los pesos de calificacion deben sumar 1");
  }

  return prisma.configCurso.upsert({
    where: { cursoId: courseId },
    update: nextConfig,
    create: { cursoId: courseId, ...nextConfig },
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
      ? { activo: true, inscripciones: { some: { estudianteId: user.id } } }
      : {}),
  };
}

async function ensureProfessorCanGrade(courseId: string, studentId: string, professorId: string) {
  const enrollment = await prisma.inscripcion.findFirst({
    where: {
      estudianteId: studentId,
      cursoId: courseId,
      curso: { profesorId: professorId, activo: true },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new ForbiddenError("Estudiante no inscrito en un curso del profesor");
  }
}

async function ensureCourseExists(courseId: string) {
  const course = await prisma.curso.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw new NotFoundError("Curso no encontrado");
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return round2(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function calculateFinalGrade(
  notaAsistencia: number | null,
  promedioAcademico: number | null,
  pesoAsistencia: number,
  pesoAcademico: number,
) {
  if (notaAsistencia === null || promedioAcademico === null) return null;
  return round2(notaAsistencia * pesoAsistencia + promedioAcademico * pesoAcademico);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
