import { Rol, TipoPregunta, EstadoCalificacion } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, HttpError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";
import type { CreateExamInput, SubmitExamInput, GradeOpenInput } from "../schemas/exam.schema.js";
import { sendExamPublishedEmail } from "./email.service.js";

const EXAM_SUBMIT_GRACE_MS = 30_000;

const examListSelect = {
  id: true,
  titulo: true,
  descripcion: true,
  cursoId: true,
  duracionMinutos: true,
  ingresoHastaMin: true,
  publicadoEn: true,
  disponibleDesde: true,
  activo: true,
  creadoEn: true,
  esSustitutorio: true,
  revelarRespuestas: true,
  curso: {
    select: {
      id: true,
      nombre: true,
      profesorId: true,
      profesor: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
    },
  },
  _count: {
    select: {
      preguntas: true,
      envios: true,
    },
  },
};

export async function listExams(user: AuthUser, cursoId?: string) {
  if (user.rol === Rol.ADMIN) {
    return prisma.examen.findMany({
      where: cursoId ? { cursoId } : undefined,
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    });
  }

  if (user.rol === Rol.PROFESOR) {
    return prisma.examen.findMany({
      where: {
        ...(cursoId ? { cursoId } : {}),
        curso: {
          profesorId: user.id,
          activo: true,
        },
      },
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    });
  }

  const enrolledWhere = {
    activo: true,
    publicadoEn: { not: null as null },
    curso: { activo: true, inscripciones: { some: { estudianteId: user.id } } },
  };
  const [regularExams, allSustitutorios] = await Promise.all([
    prisma.examen.findMany({
      where: { ...enrolledWhere, ...(cursoId ? { cursoId } : {}), esSustitutorio: false },
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    }),
    prisma.examen.findMany({
      where: { ...enrolledWhere, ...(cursoId ? { cursoId } : {}), esSustitutorio: true },
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    }),
  ]);
  const eligibleSustitutorios: typeof allSustitutorios = [];
  for (const exam of allSustitutorios) {
    if (await isStudentEligibleForSubstitutory(user.id, exam.cursoId)) {
      eligibleSustitutorios.push(exam);
    }
  }
  return [...regularExams, ...eligibleSustitutorios];
}

export async function getExamById(examId: string, user: AuthUser) {
  const exam = await prisma.examen.findUnique({
    where: { id: examId },
    include: {
      curso: {
        include: {
          profesor: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
          inscripciones: {
            select: { estudianteId: true },
          },
        },
      },
      preguntas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError("Examen no encontrado");
  }

  if (user.rol === Rol.ADMIN || (user.rol === Rol.PROFESOR && exam.curso.profesorId === user.id)) {
    return exam;
  }

  const isEnrolled = exam.curso.inscripciones.some(
    (inscripcion) => inscripcion.estudianteId === user.id,
  );

  if (user.rol !== Rol.ESTUDIANTE || !isEnrolled) {
    throw new ForbiddenError();
  }

  if (exam.esSustitutorio) {
    const eligible = await isStudentEligibleForSubstitutory(user.id, exam.cursoId);
    if (!eligible) throw new ForbiddenError("No estás habilitado para este examen sustitutorio");
  }

  // Check if student already has an attempt
  const existingAttempt = await prisma.examenEnvio.findUnique({
    where: { estudianteId_examenId: { estudianteId: user.id, examenId: exam.id } },
    select: { iniciadoEn: true, completado: true },
  });

  // New students can only enter within the ingreso window
  if (!existingAttempt && !canEnterExam(exam)) {
    throw new ForbiddenError("El examen no está disponible en este momento.");
  }

  // Existing students can still access until cierre
  if (existingAttempt && !isExamAvailable(exam)) {
    throw new ForbiddenError("El tiempo del examen ha cerrado.");
  }

  const attempt = existingAttempt ?? await prisma.examenEnvio.create({
    data: { estudianteId: user.id, examenId: exam.id },
    select: { iniciadoEn: true, completado: true },
  });

  if (!attempt.completado && isExamTimeExpired(exam, attempt.iniciadoEn)) {
    throw new ForbiddenError("El tiempo del examen ha terminado");
  }

  return {
    ...exam,
    preguntas: exam.preguntas.map(({ respuestaCorrecta: _respuestaCorrecta, ...question }) => question),
    intento: {
      iniciadoEn: attempt.iniciadoEn,
      completado: attempt.completado,
    },
    tiempoRestanteSegundos: attempt.completado
      ? 0
      : getRemainingExamSeconds(exam, attempt.iniciadoEn),
  };
}

export async function getExamResults(examId: string, user: AuthUser) {
  const exam = await prisma.examen.findUnique({
    where: { id: examId },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      duracionMinutos: true,
      disponibleDesde: true,
      revelarRespuestas: true,
      esSustitutorio: true,
      curso: {
        select: {
          id: true,
          nombre: true,
          profesorId: true,
          inscripciones: {
            where: { estudianteId: user.id },
            select: { estudianteId: true },
          },
        },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError("Examen no encontrado");
  }

  const canViewAll =
    user.rol === Rol.ADMIN || (user.rol === Rol.PROFESOR && exam.curso.profesorId === user.id);
  const isEnrolledStudent = user.rol === Rol.ESTUDIANTE && exam.curso.inscripciones.length > 0;

  if (!canViewAll && !isEnrolledStudent) {
    throw new ForbiddenError();
  }

  if (isEnrolledStudent && !exam.revelarRespuestas) {
    throw new NotFoundError("RESULTS_NOT_AVAILABLE");
  }

  // Students can only see results after cierre
  const cierre = getCierre(exam);
  if (isEnrolledStudent && cierre && cierre > new Date()) {
    throw new NotFoundError(`BEFORE_CLOSE:${cierre.toISOString()}`);
  }

  const submissions = await prisma.examenEnvio.findMany({
    where: {
      examenId: examId,
      completado: true,
      ...(isEnrolledStudent ? { estudianteId: user.id } : {}),
    },
    orderBy: { enviadoEn: "desc" },
    include: {
      estudiante: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
      respuestas: {
        orderBy: {
          pregunta: {
            orden: "asc",
          },
        },
        include: {
          pregunta: {
            select: {
              id: true,
              texto: true,
              respuestaCorrecta: true,
              puntaje: true,
            },
          },
        },
      },
    },
  });

  if (isEnrolledStudent && submissions.length === 0) {
    throw new NotFoundError("Resultado no encontrado");
  }

  return {
    exam: {
      id: exam.id,
      titulo: exam.titulo,
      descripcion: exam.descripcion,
      duracionMinutos: exam.duracionMinutos,
      curso: {
        id: exam.curso.id,
        nombre: exam.curso.nombre,
      },
    },
    submissions,
  };
}

export async function createExam(input: CreateExamInput, user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    await ensureCourseExists(input.cursoId);
  } else {
    await ensureProfessorOwnsCourse(input.cursoId, user.id);
  }

  return prisma.examen.create({
    data: {
      titulo: input.titulo,
      descripcion: input.descripcion,
      cursoId: input.cursoId,
      duracionMinutos: input.duracionMinutos,
      ingresoHastaMin: input.ingresoHastaMin,
      disponibleDesde: input.disponibleDesde,
      revelarRespuestas: input.esSustitutorio ? false : input.revelarRespuestas,
      esSustitutorio: input.esSustitutorio,
      preguntas: {
        create: input.preguntas.map((question, index) => ({
          texto: question.texto,
          tipo: question.tipo ?? TipoPregunta.OPCION_MULTIPLE,
          opciones: question.opciones,
          respuestaCorrecta: question.respuestaCorrecta,
          puntaje: question.puntaje,
          orden: index + 1,
        })),
      },
    },
    select: examListSelect,
  });
}

export async function publishExam(examId: string, user: AuthUser) {
  await ensureCanManageExam(examId, user);

  const exam = await prisma.examen.update({
    where: { id: examId },
    data: {
      publicadoEn: new Date(),
      activo: true,
    },
    include: {
      curso: {
        select: {
          nombre: true,
          inscripciones: {
            where: { estudiante: { activo: true } },
            select: { estudiante: { select: { email: true, nombre: true } } },
          },
        },
      },
    },
  });

  const students = exam.curso.inscripciones.map((i) => i.estudiante);
  await sendExamPublishedEmail(students, exam.titulo, exam.curso.nombre);

  return prisma.examen.findUnique({ where: { id: examId }, select: examListSelect });
}

export async function submitExam(examId: string, input: SubmitExamInput, user: AuthUser) {
  const exam = await prisma.examen.findUnique({
    where: { id: examId },
    include: {
      curso: {
        select: {
          activo: true,
          inscripciones: {
            where: { estudianteId: user.id },
            select: { id: true },
          },
        },
      },
      preguntas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError("Examen no encontrado");
  }

  if (user.rol !== Rol.ESTUDIANTE || exam.curso.inscripciones.length === 0 || !isExamAvailable(exam)) {
    throw new ForbiddenError();
  }

  if (exam.esSustitutorio) {
    const eligible = await isStudentEligibleForSubstitutory(user.id, exam.cursoId);
    if (!eligible) throw new ForbiddenError("No estás habilitado para este examen sustitutorio");
  }

  const existingSubmission = await prisma.examenEnvio.findUnique({
    where: {
      estudianteId_examenId: {
        estudianteId: user.id,
        examenId: examId,
      },
    },
    select: {
      id: true,
      completado: true,
      iniciadoEn: true,
    },
  });

  if (existingSubmission?.completado) {
    return getSubmissionResult(existingSubmission.id);
  }

  if (existingSubmission && isExamTimeExpired(exam, existingSubmission.iniciadoEn)) {
    throw new ForbiddenError("El tiempo del examen ha terminado");
  }

  const answerMap = new Map(input.respuestas.map((answer) => [answer.preguntaId, answer.respuesta]));

  if (answerMap.size !== input.respuestas.length) {
    throw new ForbiddenError("No puedes enviar respuestas duplicadas");
  }

  if (answerMap.size !== exam.preguntas.length) {
    throw new ForbiddenError("Debes enviar una respuesta por cada pregunta");
  }

  const responses = exam.preguntas.map((question) => {
    const studentAnswer = answerMap.get(question.id);

    if (!studentAnswer) {
      throw new ForbiddenError("Debes enviar una respuesta por cada pregunta");
    }

    if (question.tipo === TipoPregunta.ABIERTA) {
      return {
        preguntaId: question.id,
        respuesta: studentAnswer,
        esCorrecta: false,
        puntajeObtenido: 0,
        estadoCalificacion: EstadoCalificacion.PENDIENTE,
      };
    }

    const isCorrect = studentAnswer === question.respuestaCorrecta;

    return {
      preguntaId: question.id,
      respuesta: studentAnswer,
      esCorrecta: isCorrect,
      puntajeObtenido: isCorrect ? question.puntaje : 0,
      estadoCalificacion: EstadoCalificacion.AUTO,
    };
  });

  const totalScore = responses.reduce((sum, response) => sum + response.puntajeObtenido, 0);

  const submission = await prisma.$transaction(async (tx) => {
    const envio = existingSubmission
      ? await tx.examenEnvio.update({
          where: { id: existingSubmission.id },
          data: {
            enviadoEn: new Date(),
            puntajeTotal: totalScore,
            completado: true,
          },
          select: { id: true },
        })
      : await tx.examenEnvio.create({
          data: {
            estudianteId: user.id,
            examenId: exam.id,
            enviadoEn: new Date(),
            puntajeTotal: totalScore,
            completado: true,
          },
          select: { id: true },
        });

    await tx.respuestaEstudiante.deleteMany({
      where: { envioId: envio.id },
    });

    await tx.respuestaEstudiante.createMany({
      data: responses.map((response) => ({
        envioId: envio.id,
        ...response,
      })),
    });

    return envio;
  });

  return getSubmissionResult(submission.id);
}

async function getSubmissionResult(submissionId: string) {
  const submission = await prisma.examenEnvio.findUnique({
    where: { id: submissionId },
    include: {
      examen: {
        select: {
          id: true,
          titulo: true,
          duracionMinutos: true,
        },
      },
      respuestas: {
        include: {
          pregunta: {
            select: {
              id: true,
              texto: true,
              respuestaCorrecta: true,
              puntaje: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new NotFoundError("Envio no encontrado");
  }

  return submission;
}

async function isStudentEligibleForSubstitutory(studentId: string, cursoId: string): Promise<boolean> {
  const [habilitacion, mainExamSubmission] = await Promise.all([
    prisma.habilitacionSustitutorio.findUnique({
      where: { estudianteId_cursoId: { estudianteId: studentId, cursoId } },
      select: { id: true },
    }),
    prisma.examenEnvio.findFirst({
      where: { estudianteId: studentId, completado: true, examen: { cursoId, esSustitutorio: false } },
      select: { id: true },
    }),
  ]);
  if (habilitacion) return true;
  return !mainExamSubmission;
}

async function ensureProfessorOwnsCourse(courseId: string, professorId: string) {
  const course = await prisma.curso.findFirst({
    where: {
      id: courseId,
      profesorId: professorId,
      activo: true,
    },
    select: { id: true },
  });

  if (!course) {
    throw new ForbiddenError("Curso no encontrado o no asignado al profesor");
  }
}

async function ensureProfessorOwnsExam(examId: string, professorId: string) {
  const exam = await prisma.examen.findFirst({
    where: {
      id: examId,
      curso: {
        profesorId: professorId,
        activo: true,
      },
    },
    select: { id: true },
  });

  if (!exam) {
    throw new ForbiddenError("Examen no encontrado o no asignado al profesor");
  }
}

async function ensureCanManageExam(examId: string, user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    const exam = await prisma.examen.findUnique({
      where: { id: examId },
      select: { id: true },
    });
    if (!exam) throw new NotFoundError("Examen no encontrado");
    return;
  }

  await ensureProfessorOwnsExam(examId, user.id);
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

function getCierre(exam: { disponibleDesde: Date | null; duracionMinutos: number }): Date | null {
  if (!exam.disponibleDesde) return null;
  return new Date(exam.disponibleDesde.getTime() + exam.duracionMinutos * 60_000);
}

function getIngresoHasta(exam: { disponibleDesde: Date | null; ingresoHastaMin: number }): Date | null {
  if (!exam.disponibleDesde) return null;
  return new Date(exam.disponibleDesde.getTime() + exam.ingresoHastaMin * 60_000);
}

function isExamAvailable(exam: {
  activo: boolean;
  publicadoEn: Date | null;
  disponibleDesde: Date | null;
  duracionMinutos: number;
  curso: { activo: boolean };
}) {
  const now = new Date();
  if (!exam.activo || !exam.curso.activo || !exam.publicadoEn) return false;
  if (exam.disponibleDesde && exam.disponibleDesde > now) return false;
  const cierre = getCierre(exam);
  if (cierre && cierre < now) return false;
  return true;
}

function canEnterExam(exam: {
  activo: boolean;
  publicadoEn: Date | null;
  disponibleDesde: Date | null;
  ingresoHastaMin: number;
  duracionMinutos: number;
  curso: { activo: boolean };
}) {
  if (!isExamAvailable(exam)) return false;
  const ingresoHasta = getIngresoHasta(exam);
  if (ingresoHasta && ingresoHasta < new Date()) return false;
  return true;
}

function getRemainingExamSeconds(exam: { disponibleDesde: Date | null; duracionMinutos: number }, startedAt: Date) {
  const cierre = getCierre(exam) ?? new Date(startedAt.getTime() + exam.duracionMinutos * 60_000);
  return Math.max(0, Math.ceil((cierre.getTime() - Date.now()) / 1000));
}

function isExamTimeExpired(exam: { disponibleDesde: Date | null; duracionMinutos: number }, startedAt: Date) {
  const cierre = getCierre(exam) ?? new Date(startedAt.getTime() + exam.duracionMinutos * 60_000);
  return Date.now() > cierre.getTime() + EXAM_SUBMIT_GRACE_MS;
}

export async function gradeOpenAnswers(examId: string, input: GradeOpenInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const exam = await prisma.examen.findUnique({
    where: { id: examId },
    select: { id: true },
  });

  if (!exam) {
    throw new NotFoundError("Examen no encontrado");
  }

  const results = await Promise.all(
    input.calificaciones.map(({ respuestaId, puntajeManual }) =>
      prisma.respuestaEstudiante.update({
        where: { id: respuestaId },
        data: {
          puntajeManual,
          puntajeObtenido: puntajeManual,
          esCorrecta: puntajeManual > 0,
          estadoCalificacion: EstadoCalificacion.CALIFICADA,
        },
      }),
    ),
  );

  return results;
}

export async function reviewSubmission(examId: string, submissionId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const exam = await prisma.examen.findUnique({
    where: { id: examId },
    select: { id: true, cursoId: true, esSustitutorio: true, preguntas: { select: { puntaje: true } } },
  });
  if (!exam) throw new NotFoundError("Examen no encontrado");
  if (!exam.esSustitutorio) throw new HttpError(400, "Solo se puede revisar envíos de exámenes sustitutorios");

  const submission = await prisma.examenEnvio.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      estudianteId: true,
      examenId: true,
      respuestas: { select: { puntajeObtenido: true, estadoCalificacion: true } },
    },
  });
  if (!submission || submission.examenId !== examId) throw new NotFoundError("Envío no encontrado");

  const ungraded = submission.respuestas.filter((r) => r.estadoCalificacion === EstadoCalificacion.PENDIENTE);
  if (ungraded.length > 0) {
    throw new HttpError(400, `Hay ${ungraded.length} respuesta(s) sin calificar`);
  }

  const totalScore = submission.respuestas.reduce((sum, r) => sum + r.puntajeObtenido, 0);
  const maxScore = exam.preguntas.reduce((sum, q) => sum + q.puntaje, 0);
  const notaExamenRecup = maxScore > 0 ? Math.round((totalScore / maxScore) * 20 * 100) / 100 : 0;

  await prisma.$transaction([
    prisma.examenEnvio.update({ where: { id: submissionId }, data: { puntajeTotal: totalScore } }),
    prisma.registroSemanal.upsert({
      where: { estudianteId_cursoId: { estudianteId: submission.estudianteId, cursoId: exam.cursoId } },
      update: { notaExamenRecup },
      create: { estudianteId: submission.estudianteId, cursoId: exam.cursoId, notaExamenRecup },
    }),
  ]);

  return { notaExamenRecup, submissionId };
}
