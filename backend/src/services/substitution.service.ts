import { Rol } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";

const MAX_FAILED_COURSES = 3;

export async function listEligible(user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const inscriptions = await prisma.inscripcion.findMany({
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
      curso: {
        include: {
          config: true,
          notasManuales: true,
          examenes: {
            include: {
              preguntas: { select: { puntaje: true } },
              envios: {
                where: { completado: true },
                select: { estudianteId: true, puntajeTotal: true, examenId: true },
              },
            },
          },
        },
      },
    },
  });

  const failedByStudent = new Map<string, { estudianteId: string; estudiante: object; count: number }>();

  for (const insc of inscriptions) {
    const config = insc.curso.config ?? { pesoAsistencia: 0.5, pesoAcademico: 0.5, notaAprobatoria: 11 };
    const notaAsistencia = insc.notaAsistencia;

    const examGrades = insc.curso.examenes.flatMap((exam) => {
      const maxScore = exam.preguntas.reduce((sum, q) => sum + q.puntaje, 0);
      if (maxScore <= 0) return [];
      return exam.envios
        .filter((e) => e.estudianteId === insc.estudianteId)
        .map((e) => ((e.puntajeTotal ?? 0) / maxScore) * 20);
    });

    const manualGrades = insc.curso.notasManuales
      .filter((n) => n.estudianteId === insc.estudianteId)
      .map((n) => n.valor);

    const allAcademic = [...examGrades, ...manualGrades];
    const promedioAcademico = allAcademic.length > 0
      ? allAcademic.reduce((s, v) => s + v, 0) / allAcademic.length
      : null;

    if (notaAsistencia === null || promedioAcademico === null) continue;

    const notaFinal = notaAsistencia * config.pesoAsistencia + promedioAcademico * config.pesoAcademico;

    if (notaFinal < config.notaAprobatoria) {
      const existing = failedByStudent.get(insc.estudianteId) ?? {
        estudianteId: insc.estudianteId,
        estudiante: insc.estudiante,
        count: 0,
      };
      existing.count += 1;
      failedByStudent.set(insc.estudianteId, existing);
    }
  }

  return [...failedByStudent.values()].filter((s) => s.count <= MAX_FAILED_COURSES);
}

export async function enableSubstitution(estudianteId: string, cursoId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  return prisma.habilitacionSustitutorio.upsert({
    where: { estudianteId_cursoId: { estudianteId, cursoId } },
    update: { origen: "MANUAL", habilitadoPor: user.id },
    create: { estudianteId, cursoId, origen: "MANUAL", habilitadoPor: user.id },
  });
}
