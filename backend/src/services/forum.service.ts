import fs from "node:fs";
import { Rol, TipoCurso } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/http-error.js";
import { getR2Client, getR2Config } from "../utils/r2.js";
import type { AuthUser } from "../types/auth.js";

type ArchivoForum = { key: string; nombreOriginal: string };

export async function uploadForum(
  cursoId: string,
  dia: number,
  files: Express.Multer.File[],
  user: AuthUser,
) {
  if (user.rol !== Rol.ESTUDIANTE) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError();
  }

  const curso = await prisma.curso.findUnique({
    where: { id: cursoId },
    select: { tipo: true, fechaLimiteEntrega: true },
  });
  if (!curso) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new NotFoundError("Curso no encontrado");
  }
  if (curso.tipo !== TipoCurso.DIPLOMADO) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError("Este curso no maneja forums");
  }

  const inscripcion = await prisma.inscripcion.findUnique({
    where: { estudianteId_cursoId: { estudianteId: user.id, cursoId } },
    select: { id: true },
  });
  if (!inscripcion) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError();
  }

  if (curso.fechaLimiteEntrega && new Date() > curso.fechaLimiteEntrega) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError("El plazo de entrega ha vencido");
  }

  const r2Config = getR2Config();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const r2Client = await getR2Client();
  const archivos: ArchivoForum[] = [];

  for (const file of files) {
    const key = `forums/${cursoId}/${user.id}/dia${dia}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      }));
      archivos.push({ key, nombreOriginal: file.originalname });
    } finally {
      await fs.promises.rm(file.path, { force: true });
    }
  }

  return prisma.entregaForum.upsert({
    where: { cursoId_estudianteId_dia: { cursoId, estudianteId: user.id, dia } },
    create: { cursoId, estudianteId: user.id, dia, archivos, entregadoEn: new Date() },
    update: { archivos, entregadoEn: new Date(), nota: null, revisadoEn: null },
  });
}

export async function deleteForum(cursoId: string, dia: number, user: AuthUser) {
  if (user.rol !== Rol.ESTUDIANTE) throw new ForbiddenError();

  const entrega = await prisma.entregaForum.findUnique({
    where: { cursoId_estudianteId_dia: { cursoId, estudianteId: user.id, dia } },
    select: { id: true, archivos: true },
  });
  if (!entrega) throw new NotFoundError("Entrega no encontrada");

  const archivos = Array.isArray(entrega.archivos) ? (entrega.archivos as unknown as ArchivoForum[]) : [];
  if (archivos.length > 0) {
    const r2Config = getR2Config();
    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const r2Client = await getR2Client();
    await r2Client.send(new DeleteObjectsCommand({
      Bucket: r2Config.bucketName,
      Delete: { Objects: archivos.map((a) => ({ Key: a.key })) },
    }));
  }

  await prisma.entregaForum.delete({ where: { id: entrega.id } });
}

export async function getMyForumStatus(cursoId: string, user: AuthUser) {
  if (user.rol !== Rol.ESTUDIANTE) throw new ForbiddenError();

  const entregas = await prisma.entregaForum.findMany({
    where: { cursoId, estudianteId: user.id },
    select: { id: true, dia: true, archivos: true, entregadoEn: true, nota: true },
  });

  return entregas.map((e) => ({
    id: e.id,
    dia: e.dia,
    archivosCount: Array.isArray(e.archivos) ? e.archivos.length : 0,
    entregadoEn: e.entregadoEn,
    nota: e.nota,
  }));
}

export async function listForumSubmitters(cursoId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  await ensureCourseExists(cursoId);

  const entregas = await prisma.entregaForum.findMany({
    where: { cursoId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
    orderBy: { estudiante: { apellido: "asc" } },
  });

  const porEstudiante = new Map<string, { estudiante: typeof entregas[number]["estudiante"]; dias: number[] }>();
  for (const e of entregas) {
    const actual = porEstudiante.get(e.estudianteId);
    if (actual) {
      actual.dias.push(e.dia);
    } else {
      porEstudiante.set(e.estudianteId, { estudiante: e.estudiante, dias: [e.dia] });
    }
  }

  return Array.from(porEstudiante.values()).map((v) => ({
    ...v,
    dias: v.dias.sort((a, b) => a - b),
  }));
}

export async function getStudentSubmissions(cursoId: string, studentId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  await ensureCourseExists(cursoId);

  const entregas = await prisma.entregaForum.findMany({
    where: { cursoId, estudianteId: studentId },
    orderBy: { dia: "asc" },
    select: { id: true, dia: true, archivos: true, entregadoEn: true, nota: true, revisadoEn: true },
  });

  return entregas.map((e) => ({
    id: e.id,
    dia: e.dia,
    archivosCount: Array.isArray(e.archivos) ? e.archivos.length : 0,
    entregadoEn: e.entregadoEn,
    nota: e.nota,
    revisadoEn: e.revisadoEn,
  }));
}

export async function reviewForum(entregaId: string, nota: number | null, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const entrega = await prisma.entregaForum.findUnique({
    where: { id: entregaId },
    select: { id: true },
  });
  if (!entrega) throw new NotFoundError("Entrega no encontrada");

  if (typeof nota === "number" && (nota < 0 || nota > 20)) {
    throw new ValidationError("La nota debe estar entre 0 y 20.");
  }

  return prisma.entregaForum.update({
    where: { id: entregaId },
    data: { nota, revisadoEn: new Date() },
  });
}

export async function getForumFileUrls(entregaId: string, user: AuthUser) {
  const entrega = await prisma.entregaForum.findUnique({
    where: { id: entregaId },
    select: { id: true, cursoId: true, estudianteId: true, archivos: true },
  });
  if (!entrega) throw new NotFoundError("Entrega no encontrada");

  if (user.rol === Rol.ESTUDIANTE) {
    if (entrega.estudianteId !== user.id) throw new ForbiddenError();
  } else if (user.rol === Rol.PROFESOR) {
    const course = await prisma.curso.findFirst({
      where: { id: entrega.cursoId, profesorId: user.id },
      select: { id: true },
    });
    if (!course) throw new ForbiddenError();
  } else if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const archivos = Array.isArray(entrega.archivos) ? (entrega.archivos as unknown as ArchivoForum[]) : [];
  if (archivos.length === 0) return { urls: [] };

  const r2Config = getR2Config();
  const [{ GetObjectCommand }, { getSignedUrl }, r2Client] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
    getR2Client(),
  ]);

  const urls = await Promise.all(
    archivos.map(async (a) => ({
      filename: a.nombreOriginal,
      url: await getSignedUrl(r2Client, new GetObjectCommand({ Bucket: r2Config.bucketName, Key: a.key }), { expiresIn: 900 }),
    })),
  );
  return { urls };
}

async function ensureCourseExists(cursoId: string) {
  const course = await prisma.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (!course) throw new NotFoundError("Curso no encontrado");
}

function sanitizeFileName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}
