import { prisma } from "../utils/prisma.js";
import { HttpError, NotFoundError } from "../utils/http-error.js";
import type { CreateBloqueInput } from "../schemas/bloque.schema.js";

const bloqueSelect = {
  id: true,
  nombre: true,
  creadoEn: true,
  finalizadoEn: true,
  cursos: {
    select: { id: true, nombre: true, notasPublicadasEn: true },
  },
};

export async function listBloques() {
  return prisma.bloque.findMany({
    orderBy: { creadoEn: "desc" },
    select: bloqueSelect,
  });
}

export async function createBloque(input: CreateBloqueInput) {
  return prisma.bloque.create({
    data: { nombre: input.nombre },
    select: bloqueSelect,
  });
}

// Bloquea el envio de notas de un curso mientras exista OTRO bloque con notas
// ya enviadas y aun sin finalizar: solo un bloque puede estar "en progreso" a la vez.
export async function ensureNoOtherBloqueEnProgreso(bloqueId: string) {
  const otroEnProgreso = await prisma.bloque.findFirst({
    where: {
      id: { not: bloqueId },
      finalizadoEn: null,
      cursos: { some: { notasPublicadasEn: { not: null } } },
    },
    select: { id: true, nombre: true },
  });

  if (otroEnProgreso) {
    throw new HttpError(
      409,
      `Ya hay notas enviadas del bloque "${otroEnProgreso.nombre}" sin finalizar. Finaliza ese ciclo antes de enviar notas de otro bloque.`,
    );
  }
}

export async function finalizeBloque(bloqueId: string) {
  const bloque = await prisma.bloque.findUnique({
    where: { id: bloqueId },
    select: {
      id: true,
      finalizadoEn: true,
      cursos: { select: { id: true, nombre: true, notasPublicadasEn: true } },
    },
  });

  if (!bloque) throw new NotFoundError("Bloque no encontrado");
  if (bloque.finalizadoEn) throw new HttpError(400, "Este bloque ya fue finalizado");
  if (bloque.cursos.length === 0) throw new HttpError(400, "El bloque no tiene cursos asignados");

  const pendientes = bloque.cursos.filter((c) => c.notasPublicadasEn === null);
  if (pendientes.length > 0) {
    throw new HttpError(
      400,
      `Faltan enviar notas de: ${pendientes.map((c) => c.nombre).join(", ")}`,
    );
  }

  const cursoIds = bloque.cursos.map((c) => c.id);

  const inscripciones = await prisma.inscripcion.findMany({
    where: { cursoId: { in: cursoIds } },
    select: { estudianteId: true },
    distinct: ["estudianteId"],
  });

  const registros = await prisma.registroSemanal.findMany({
    where: { cursoId: { in: cursoIds }, estudianteId: { in: inscripciones.map((i) => i.estudianteId) } },
    select: { estudianteId: true, notaFinalPublicada: true },
  });

  const notasPorEstudiante = new Map<string, number[]>();
  for (const r of registros) {
    if (r.notaFinalPublicada === null) continue;
    const arr = notasPorEstudiante.get(r.estudianteId) ?? [];
    arr.push(r.notaFinalPublicada);
    notasPorEstudiante.set(r.estudianteId, arr);
  }

  await prisma.$transaction(async (tx) => {
    for (const [estudianteId, notas] of notasPorEstudiante) {
      if (notas.length === 0) continue;
      const promedio = Math.round((notas.reduce((sum, n) => sum + n, 0) / notas.length) * 100) / 100;

      await tx.promedioBloque.upsert({
        where: { bloqueId_estudianteId: { bloqueId, estudianteId } },
        update: { promedio },
        create: { bloqueId, estudianteId, promedio },
      });
    }

    await tx.bloque.update({
      where: { id: bloqueId },
      data: { finalizadoEn: new Date() },
    });
  });

  return prisma.bloque.findUniqueOrThrow({ where: { id: bloqueId }, select: bloqueSelect });
}
