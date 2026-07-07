import { ModoEstudio, Prisma, Rol, TipoCurso } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
import { notaAsistencia13 } from "../utils/nota-asistencia.js";
import type { AuthUser } from "../types/auth.js";

type CeldasCamara = {
  d1c1?: string; d1c2?: string; d1c3?: string;
  d2c1?: string; d2c2?: string; d2c3?: string;
  d3c1?: string; d3c2?: string; d3c3?: string;
};

function buildRow(modo: ModoEstudio, celdas: Record<string, unknown>): (string | number | null | undefined)[] {
  const g = (k: string) => (celdas[k] ?? "") as string | number | null | undefined;
  return [
    modo,
    g("d1c1"), g("d1c2"), g("d1c3"), g("d1NT"),
    g("d2c1"), g("d2c2"), g("d2c3"), g("d2NT"),
    g("d3c1"), g("d3c2"), g("d3c3"), g("d3NT"),
  ];
}

async function fetchExamNotes(estudianteId: string, cursoId: string) {
  const envios = await prisma.examenEnvio.findMany({
    where: {
      estudianteId,
      completado: true,
      puntajeTotal: { not: null },
      examen: { cursoId },
    },
    include: { examen: { select: { esSustitutorio: true } } },
    orderBy: { enviadoEn: "desc" },
  });

  let notaExamenNorm: number | null = null;
  let notaExamenRecup: number | null = null;

  for (const e of envios) {
    if (e.examen.esSustitutorio && notaExamenRecup === null) {
      notaExamenRecup = e.puntajeTotal;
    } else if (!e.examen.esSustitutorio && notaExamenNorm === null) {
      notaExamenNorm = e.puntajeTotal;
    }
    if (notaExamenNorm !== null && notaExamenRecup !== null) break;
  }

  return { notaExamenNorm, notaExamenRecup };
}

function averageDiplomadoNota(ntMap: Record<number, number | null>, numDias: 1 | 2 | 3) {
  const valores = Array.from({ length: numDias }, (_, i) => ntMap[i + 1]).filter(
    (v): v is number => v !== null && v !== undefined,
  );
  if (valores.length === 0) return null;
  return valores.reduce((sum, v) => sum + v, 0) / valores.length;
}

async function fetchNTForCourse(estudianteId: string, cursoId: string) {
  const sesiones = await prisma.sesion.findMany({
    where: { cursoId },
    orderBy: { orden: "asc" },
    select: { id: true, orden: true },
  });

  const ntMap: Record<number, number | null> = {};
  for (const s of sesiones) {
    const entrega = await prisma.entregaResumen.findUnique({
      where: { sesionId_estudianteId: { sesionId: s.id, estudianteId } },
      select: { notaTranscripcion: true },
    });
    ntMap[s.orden] = entrega?.notaTranscripcion ?? null;
  }
  return ntMap; // { 1: 15, 2: null, 3: 12, ... }
}

function computeNotas(modo: ModoEstudio, celdas: Record<string, unknown>, numDias: 1 | 2 | 3, notaExamenNorm: number | null, notaExamenRecup: number | null) {
  const row = buildRow(modo, celdas);
  const notaAsistencia = notaAsistencia13(row, numDias);
  const notaExamen = notaExamenRecup ?? notaExamenNorm ?? 0;
  const notaFinal = Math.floor((notaAsistencia + notaExamen) / 2);
  return { notaAsistencia, notaFinal };
}

export async function getGradesSheet(courseId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const curso = await prisma.curso.findUnique({
    where: { id: courseId },
    include: {
      config: true,
      inscripciones: {
        include: {
          estudiante: {
            select: {
              id: true, nombre: true, apellido: true,
              codigo: true, modo: true,
            },
          },
        },
      },
    },
  });
  if (!curso) throw new NotFoundError("Curso no encontrado");

  const numDias = (curso.config?.numDias ?? 3) as 1 | 2 | 3;

  const filas = await Promise.all(
    curso.inscripciones.map(async (ins: typeof curso.inscripciones[number]) => {
      const est = ins.estudiante;
      const registro = await prisma.registroSemanal.findUnique({
        where: { estudianteId_cursoId: { estudianteId: est.id, cursoId: courseId } },
      });

      const ntMap = await fetchNTForCourse(est.id, courseId);
      const modo = (registro?.modo ?? est.modo ?? ModoEstudio.SINCRONICO) as ModoEstudio;
      const rowNumDias = (registro?.numDias ?? numDias) as 1 | 2 | 3;

      const { notaExamenNorm, notaExamenRecup } =
        curso.tipo === TipoCurso.DIPLOMADO
          ? { notaExamenNorm: averageDiplomadoNota(ntMap, rowNumDias), notaExamenRecup: null }
          : await fetchExamNotes(est.id, courseId);

      const celdasCamara = (registro?.celdas as Record<string, unknown> | null) ?? {};
      const celdas: Record<string, unknown> = {
        ...celdasCamara,
        d1NT: ntMap[1] ?? null,
        d2NT: ntMap[2] ?? null,
        d3NT: ntMap[3] ?? null,
      };

      const { notaAsistencia, notaFinal } = computeNotas(modo, celdas, rowNumDias, notaExamenNorm, notaExamenRecup);

      return {
        estudianteId: est.id,
        codigo: est.codigo ?? "",
        nombre: est.nombre,
        apellido: est.apellido,
        modo,
        celdasCamara: {
          d1c1: celdasCamara.d1c1 ?? "",
          d1c2: celdasCamara.d1c2 ?? "",
          d1c3: celdasCamara.d1c3 ?? "",
          d2c1: celdasCamara.d2c1 ?? "",
          d2c2: celdasCamara.d2c2 ?? "",
          d2c3: celdasCamara.d2c3 ?? "",
          d3c1: celdasCamara.d3c1 ?? "",
          d3c2: celdasCamara.d3c2 ?? "",
          d3c3: celdasCamara.d3c3 ?? "",
        },
        ntDia1: ntMap[1] ?? null,
        ntDia2: ntMap[2] ?? null,
        ntDia3: ntMap[3] ?? null,
        notaAsistencia,
        notaExamenNorm,
        notaExamenRecup,
        notaFinal,
      };
    })
  );

  return { numDias, tipo: curso.tipo, filas };
}

export async function publishGrades(courseId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const curso = await prisma.curso.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!curso) throw new NotFoundError("Curso no encontrado");

  // Prisma doesn't support field-to-field copy in updateMany, so we do it per-row
  const registros = await prisma.registroSemanal.findMany({
    where: { cursoId: courseId },
    select: { id: true, notaFinal: true },
  });

  await Promise.all(
    registros.map((r) =>
      prisma.registroSemanal.update({
        where: { id: r.id },
        data: { notaFinalPublicada: r.notaFinal ?? null },
      }),
    ),
  );

  return prisma.curso.update({
    where: { id: courseId },
    data: { notasPublicadasEn: new Date() },
    select: { id: true, notasPublicadasEn: true },
  });
}

export async function getPublishedGrades(courseId: string, user: AuthUser) {
  if (user.rol !== Rol.PROFESOR) throw new ForbiddenError();

  const curso = await prisma.curso.findFirst({
    where: { id: courseId, profesorId: user.id },
    select: {
      id: true,
      nombre: true,
      notasPublicadasEn: true,
      inscripciones: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, codigo: true } },
        },
      },
    },
  });
  if (!curso) throw new ForbiddenError();

  if (!curso.notasPublicadasEn) {
    return { publicadas: false, notasPublicadasEn: null, filas: [] };
  }

  const filas = await Promise.all(
    curso.inscripciones.map(async (ins) => {
      const registro = await prisma.registroSemanal.findUnique({
        where: { estudianteId_cursoId: { estudianteId: ins.estudianteId, cursoId: courseId } },
        select: { notaFinalPublicada: true },
      });
      return {
        estudianteId: ins.estudianteId,
        codigo: ins.estudiante.codigo ?? "",
        nombre: ins.estudiante.nombre,
        apellido: ins.estudiante.apellido,
        notaFinalPublicada: registro?.notaFinalPublicada ?? null,
      };
    }),
  );

  return {
    publicadas: true,
    notasPublicadasEn: curso.notasPublicadasEn.toISOString(),
    filas,
  };
}

export async function getMyPublishedGrades(user: AuthUser) {
  if (user.rol !== Rol.ESTUDIANTE) throw new ForbiddenError();

  const inscripciones = await prisma.inscripcion.findMany({
    where: { estudianteId: user.id },
    include: {
      curso: {
        select: { id: true, nombre: true, ciclo: true, anio: true, notasPublicadasEn: true },
      },
    },
    orderBy: { curso: { anio: "desc" } },
  });

  return Promise.all(inscripciones.map(async (ins) => {
    const registro = await prisma.registroSemanal.findUnique({
      where: { estudianteId_cursoId: { estudianteId: user.id, cursoId: ins.cursoId } },
      select: { notaFinalPublicada: true },
    });
    return {
      cursoId: ins.cursoId,
      nombre: ins.curso.nombre,
      ciclo: ins.curso.ciclo,
      anio: ins.curso.anio,
      publicadas: ins.curso.notasPublicadasEn !== null,
      notasPublicadasEn: ins.curso.notasPublicadasEn?.toISOString() ?? null,
      notaFinalPublicada: ins.curso.notasPublicadasEn ? (registro?.notaFinalPublicada ?? null) : null,
    };
  }));
}

export async function upsertGradeRow(
  courseId: string,
  input: { estudianteId: string; modo: ModoEstudio; numDias: 1 | 2 | 3; celdasCamara: CeldasCamara },
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const ins = await prisma.inscripcion.findUnique({
    where: { estudianteId_cursoId: { estudianteId: input.estudianteId, cursoId: courseId } },
  });
  if (!ins) throw new NotFoundError("Estudiante no inscrito en este curso");

  const curso = await prisma.curso.findUniqueOrThrow({
    where: { id: courseId },
    select: { tipo: true },
  });

  const ntMap = await fetchNTForCourse(input.estudianteId, courseId);
  const { notaExamenNorm, notaExamenRecup } =
    curso.tipo === TipoCurso.DIPLOMADO
      ? { notaExamenNorm: averageDiplomadoNota(ntMap, input.numDias), notaExamenRecup: null }
      : await fetchExamNotes(input.estudianteId, courseId);

  const celdas: Record<string, unknown> = {
    ...input.celdasCamara,
    d1NT: ntMap[1] ?? null,
    d2NT: ntMap[2] ?? null,
    d3NT: ntMap[3] ?? null,
  };

  const { notaAsistencia, notaFinal } = computeNotas(input.modo, celdas, input.numDias, notaExamenNorm, notaExamenRecup);

  return prisma.registroSemanal.upsert({
    where: { estudianteId_cursoId: { estudianteId: input.estudianteId, cursoId: courseId } },
    create: {
      estudianteId: input.estudianteId,
      cursoId: courseId,
      modo: input.modo,
      numDias: input.numDias,
      celdas: celdas as Prisma.InputJsonValue,
      notaAsistencia,
      notaExamenNorm,
      notaExamenRecup,
      notaFinal,
    },
    update: {
      modo: input.modo,
      numDias: input.numDias,
      celdas: celdas as Prisma.InputJsonValue,
      notaAsistencia,
      notaExamenNorm,
      notaExamenRecup,
      notaFinal,
    },
  });
}
