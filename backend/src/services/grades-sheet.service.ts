import { ModoEstudio, Prisma, Rol, TipoCurso } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/http-error.js";
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

// El envio real del modulo de examenes SIEMPRE tiene prioridad. El valor manual
// (edicion a mano o importacion CSV) solo se usa como respaldo mientras no exista
// un envio real, igual que la nota de Forum en Diplomado.
function resolveExamNotes(
  auto: { notaExamenNorm: number | null; notaExamenRecup: number | null },
  manual: { notaExamenNormManual: number | null; notaExamenRecupManual: number | null } | null,
) {
  return {
    notaExamenNorm: auto.notaExamenNorm ?? manual?.notaExamenNormManual ?? null,
    notaExamenRecup: auto.notaExamenRecup ?? manual?.notaExamenRecupManual ?? null,
    examenNormAuto: auto.notaExamenNorm !== null,
    examenRecupAuto: auto.notaExamenRecup !== null,
  };
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

// Diplomado tiene un unico Forum semanal (dia 1). La nota se puede colocar
// tanto desde "Corregir forums" (revisando los archivos subidos) como
// directamente en la grilla de notas, haya o no archivos subidos.
async function fetchForumEntrega(estudianteId: string, cursoId: string) {
  const entrega = await prisma.entregaForum.findUnique({
    where: { cursoId_estudianteId_dia: { cursoId, estudianteId, dia: 1 } },
    select: { nota: true, archivos: true },
  });
  const archivosCount = entrega && Array.isArray(entrega.archivos) ? (entrega.archivos as unknown[]).length : 0;
  return { nota: entrega?.nota ?? null, entregado: archivosCount > 0 };
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

      const esDiplomado = curso.tipo === TipoCurso.DIPLOMADO;
      const ntMap: Record<number, number | null> = esDiplomado ? {} : await fetchNTForCourse(est.id, courseId);
      const forumEntrega = esDiplomado ? await fetchForumEntrega(est.id, courseId) : null;
      const modo = (registro?.modo ?? est.modo ?? ModoEstudio.SINCRONICO) as ModoEstudio;
      const rowNumDias = (registro?.numDias ?? numDias) as 1 | 2 | 3;

      const { notaExamenNorm, notaExamenRecup, examenNormAuto, examenRecupAuto } = esDiplomado
        ? { notaExamenNorm: forumEntrega!.nota ?? 0, notaExamenRecup: null, examenNormAuto: true, examenRecupAuto: true }
        : resolveExamNotes(await fetchExamNotes(est.id, courseId), registro);

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
        forumEntregado: forumEntrega?.entregado ?? false,
        notaAsistencia,
        notaExamenNorm,
        notaExamenRecup,
        examenNormAuto,
        examenRecupAuto,
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
  input: {
    estudianteId: string;
    modo: ModoEstudio;
    numDias: 1 | 2 | 3;
    celdasCamara: CeldasCamara;
    notaForumManual?: number | null;
    notaExamenNormManual?: number | null;
    notaExamenRecupManual?: number | null;
  },
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

  const esDiplomado = curso.tipo === TipoCurso.DIPLOMADO;
  const ntMap: Record<number, number | null> = esDiplomado ? {} : await fetchNTForCourse(input.estudianteId, courseId);

  const registroExistente = esDiplomado ? null : await prisma.registroSemanal.findUnique({
    where: { estudianteId_cursoId: { estudianteId: input.estudianteId, cursoId: courseId } },
    select: { notaExamenNormManual: true, notaExamenRecupManual: true },
  });

  for (const [label, v] of [["NORM.", input.notaExamenNormManual], ["RECUP.", input.notaExamenRecupManual]] as const) {
    if (v !== undefined && v !== null && (v < 0 || v > 20)) {
      throw new ValidationError(`La nota de examen ${label} debe estar entre 0 y 20.`);
    }
  }

  const notaExamenNormManual = esDiplomado ? null
    : (input.notaExamenNormManual !== undefined ? input.notaExamenNormManual : registroExistente?.notaExamenNormManual ?? null);
  const notaExamenRecupManual = esDiplomado ? null
    : (input.notaExamenRecupManual !== undefined ? input.notaExamenRecupManual : registroExistente?.notaExamenRecupManual ?? null);

  if (esDiplomado && input.notaForumManual !== undefined) {
    if (input.notaForumManual !== null && (input.notaForumManual < 0 || input.notaForumManual > 20)) {
      throw new ValidationError("La nota debe estar entre 0 y 20.");
    }
    await prisma.entregaForum.upsert({
      where: { cursoId_estudianteId_dia: { cursoId: courseId, estudianteId: input.estudianteId, dia: 1 } },
      create: { cursoId: courseId, estudianteId: input.estudianteId, dia: 1, archivos: [], nota: input.notaForumManual, revisadoEn: new Date() },
      update: { nota: input.notaForumManual, revisadoEn: new Date() },
    });
  }

  const { notaExamenNorm, notaExamenRecup } = esDiplomado
    ? { notaExamenNorm: (await fetchForumEntrega(input.estudianteId, courseId)).nota ?? 0, notaExamenRecup: null }
    : resolveExamNotes(await fetchExamNotes(input.estudianteId, courseId), { notaExamenNormManual, notaExamenRecupManual });

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
      notaExamenNormManual,
      notaExamenRecupManual,
      notaFinal,
    },
    update: {
      modo: input.modo,
      numDias: input.numDias,
      celdas: celdas as Prisma.InputJsonValue,
      notaAsistencia,
      notaExamenNorm,
      notaExamenRecup,
      notaExamenNormManual,
      notaExamenRecupManual,
      notaFinal,
    },
  });
}

export type ImportGradeRow = {
  codigo: string;
  nombre: string; // "Apellidos y Nombres" tal como viene en el CSV, para matchear por nombre si no hay código.
  modo?: ModoEstudio;
  celdasCamara: CeldasCamara;
  notaExamenManual?: number | null; // Diplomado: nota de Forum. Regular: nota de examen NORM.
  notaExamenRecupManual?: number | null; // Solo curso regular.
};

// Normaliza un nombre completo para matchear sin importar tildes, mayusculas,
// espacios extra o el orden en que vengan apellidos/nombres.
function normalizarNombreKey(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

// Importa filas de una grilla exportada en formato CSV (código, modo, celdas de
// cámara por día, examen NORM./RECUP.). Matchea cada fila contra los alumnos
// inscritos en el curso primero por código; si no hay código o no matchea, cae a
// nombre y apellido (normalizado). Lo que no matchea queda como "saltado" (alumnos
// no registrados en este curso), sin crear ni tocar nada para ellos.
export async function importGradesSheet(
  courseId: string,
  numDias: 1 | 2 | 3,
  rows: ImportGradeRow[],
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const curso = await prisma.curso.findUnique({
    where: { id: courseId },
    include: { inscripciones: { include: { estudiante: { select: { id: true, codigo: true, modo: true, nombre: true, apellido: true } } } } },
  });
  if (!curso) throw new NotFoundError("Curso no encontrado");

  const porCodigo = new Map<string, { id: string; modo: ModoEstudio }>();
  const porNombre = new Map<string, { id: string; modo: ModoEstudio }>();
  for (const ins of curso.inscripciones) {
    const est = ins.estudiante;
    if (est.codigo) porCodigo.set(est.codigo.trim(), { id: est.id, modo: est.modo });
    const key = normalizarNombreKey(`${est.apellido} ${est.nombre}`);
    if (key) porNombre.set(key, { id: est.id, modo: est.modo });
  }

  let actualizados = 0;
  let saltados = 0;
  const errores: string[] = [];

  for (const row of rows) {
    const codigo = row.codigo.trim();
    const match = (codigo ? porCodigo.get(codigo) : undefined)
      ?? (row.nombre ? porNombre.get(normalizarNombreKey(row.nombre)) : undefined);
    if (!match) {
      saltados++;
      errores.push(`"${row.nombre || "(sin nombre)"}" (código: ${codigo || "—"}) no está inscrito en este curso`);
      continue;
    }

    try {
      await upsertGradeRow(
        courseId,
        {
          estudianteId: match.id,
          modo: row.modo ?? match.modo,
          numDias,
          celdasCamara: row.celdasCamara,
          ...(curso.tipo === TipoCurso.DIPLOMADO
            ? { notaForumManual: row.notaExamenManual ?? undefined }
            : { notaExamenNormManual: row.notaExamenManual ?? undefined, notaExamenRecupManual: row.notaExamenRecupManual ?? undefined }),
        },
        user,
      );
      actualizados++;
    } catch (e) {
      errores.push(`Código ${codigo}: ${e instanceof Error ? e.message : "error desconocido"}`);
      saltados++;
    }
  }

  return { actualizados, saltados, errores };
}
