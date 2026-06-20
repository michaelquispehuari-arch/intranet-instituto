import { Rol, TipoPregunta, EstadoCalificacion } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
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
  publicadoEn: true,
  disponibleDesde: true,
  disponibleHasta: true,
  activo: true,
  creadoEn: true,
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

export async function listExams(user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    return prisma.examen.findMany({
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    });
  }

  if (user.rol === Rol.PROFESOR) {
    return prisma.examen.findMany({
      where: {
        curso: {
          profesorId: user.id,
          activo: true,
        },
      },
      orderBy: { creadoEn: "desc" },
      select: examListSelect,
    });
  }

  return prisma.examen.findMany({
    where: {
      activo: true,
      publicadoEn: { not: null },
      curso: {
        activo: true,
        inscripciones: {
          some: {
            estudianteId: user.id,
          },
        },
      },
    },
    orderBy: { creadoEn: "desc" },
    select: examListSelect,
  });
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

  if (user.rol !== Rol.ESTUDIANTE || !isEnrolled || !isExamAvailable(exam)) {
    throw new ForbiddenError();
  }

  const attempt = await prisma.examenEnvio.upsert({
    where: {
      estudianteId_examenId: {
        estudianteId: user.id,
        examenId: exam.id,
      },
    },
    update: {},
    create: {
      estudianteId: user.id,
      examenId: exam.id,
    },
    select: {
      iniciadoEn: true,
      completado: true,
    },
  });

  if (!attempt.completado && isExamTimeExpired(attempt.iniciadoEn, exam.duracionMinutos)) {
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
      : getRemainingExamSeconds(attempt.iniciadoEn, exam.duracionMinutos),
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
      disponibleDesde: input.disponibleDesde,
      disponibleHasta: input.disponibleHasta,
      revelarRespuestas: input.revelarRespuestas,
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

  const { curso: _curso, ...examData } = exam;
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

  if (
    existingSubmission &&
    isExamTimeExpired(existingSubmission.iniciadoEn, exam.duracionMinutos)
  ) {
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

function isExamAvailable(exam: {
  activo: boolean;
  publicadoEn: Date | null;
  disponibleDesde: Date | null;
  disponibleHasta: Date | null;
  curso: { activo: boolean };
}) {
  const now = new Date();

  if (!exam.activo || !exam.curso.activo || !exam.publicadoEn) {
    return false;
  }

  if (exam.disponibleDesde && exam.disponibleDesde > now) {
    return false;
  }

  if (exam.disponibleHasta && exam.disponibleHasta < now) {
    return false;
  }

  return true;
}

function getRemainingExamSeconds(startedAt: Date, durationMinutes: number) {
  const endsAt = startedAt.getTime() + durationMinutes * 60_000;
  const remainingMs = Math.max(0, endsAt - Date.now());

  return Math.ceil(remainingMs / 1000);
}

function isExamTimeExpired(startedAt: Date, durationMinutes: number) {
  const expiresAt = startedAt.getTime() + durationMinutes * 60_000 + EXAM_SUBMIT_GRACE_MS;

  return Date.now() > expiresAt;
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
