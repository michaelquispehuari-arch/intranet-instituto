import fs from "node:fs";
import { Rol } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";
import { getR2Client, getR2Config } from "../utils/r2.js";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  UpsertSessionAttendanceInput,
  RequireSummaryInput,
  UpdateSummaryDeadlineInput,
} from "../schemas/session.schema.js";

export async function listSessions(courseId: string, user: AuthUser) {
  await ensureCanAccessCourse(courseId, user);

  return prisma.sesion.findMany({
    where: { cursoId: courseId },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      fecha: true,
      titulo: true,
      enlaceGrabacion: true,
      orden: true,
      creadoEn: true,
    },
  });
}

export async function getSessionById(sessionId: string, user: AuthUser) {
  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    include: {
      curso: {
        include: {
          inscripciones: { select: { estudianteId: true } },
        },
      },
      materiales: true,
      asistencias: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      },
      resumenes: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      },
    },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  await ensureCanAccessCourse(session.cursoId, user);

  if (user.rol === Rol.ESTUDIANTE) {
    return {
      ...session,
      asistencias: session.asistencias.filter((a) => a.estudianteId === user.id),
      resumenes: session.resumenes.filter((r) => r.estudianteId === user.id),
    };
  }

  return session;
}

export async function createSession(courseId: string, input: CreateSessionInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  await ensureCourseExists(courseId);

  return prisma.sesion.create({
    data: {
      cursoId: courseId,
      fecha: input.fecha,
      titulo: input.titulo,
      orden: input.orden,
      enlaceGrabacion: input.enlaceGrabacion || null,
    },
  });
}

export async function updateSession(sessionId: string, input: UpdateSessionInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  return prisma.sesion.update({
    where: { id: sessionId },
    data: input,
  });
}

export async function listSessionAttendance(sessionId: string, user: AuthUser) {
  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true, cursoId: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  if (user.rol === Rol.ESTUDIANTE) {
    throw new ForbiddenError();
  }

  if (user.rol === Rol.PROFESOR) {
    await ensureProfessorOwnsCourse(session.cursoId, user.id);
  }

  return prisma.asistencia.findMany({
    where: { sesionId: sessionId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
    orderBy: { estudiante: { apellido: "asc" } },
  });
}

export async function upsertSessionAttendance(
  sessionId: string,
  input: UpsertSessionAttendanceInput,
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  const results = await Promise.all(
    input.asistencias.map((a) =>
      prisma.asistencia.upsert({
        where: {
          estudianteId_sesionId: {
            estudianteId: a.estudianteId,
            sesionId: sessionId,
          },
        },
        update: { estado: a.estado, observacion: a.observacion },
        create: {
          estudianteId: a.estudianteId,
          sesionId: sessionId,
          estado: a.estado,
          observacion: a.observacion,
        },
      }),
    ),
  );

  return results;
}

export async function listSummaries(sessionId: string, user: AuthUser) {
  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true, cursoId: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  if (user.rol === Rol.ESTUDIANTE) {
    throw new ForbiddenError();
  }

  if (user.rol === Rol.PROFESOR) {
    await ensureProfessorOwnsCourse(session.cursoId, user.id);
  }

  return prisma.entregaResumen.findMany({
    where: { sesionId: sessionId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
    orderBy: { estudiante: { apellido: "asc" } },
  });
}

export async function requireSummaries(
  sessionId: string,
  input: RequireSummaryInput,
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  return Promise.all(
    input.estudianteIds.map((estudianteId) =>
      prisma.entregaResumen.upsert({
        where: {
          sesionId_estudianteId: { sesionId: sessionId, estudianteId },
        },
        update: { requerido: true },
        create: { sesionId: sessionId, estudianteId, requerido: true },
      }),
    ),
  );
}

export async function uploadSummary(
  sessionId: string,
  file: Express.Multer.File,
  user: AuthUser,
) {
  const entrega = await prisma.entregaResumen.findUnique({
    where: {
      sesionId_estudianteId: { sesionId: sessionId, estudianteId: user.id },
    },
  });

  if (!entrega || !entrega.requerido) {
    await fs.promises.rm(file.path, { force: true });
    throw new ForbiddenError("No tienes asignada una entrega de resumen para esta sesion");
  }

  if (entrega.fechaLimite && new Date() > entrega.fechaLimite) {
    await fs.promises.rm(file.path, { force: true });
    throw new ForbiddenError("El plazo de entrega ha vencido");
  }

  const objectKey = `resumenes/${sessionId}/${user.id}-${Date.now()}-${sanitizeFileName(file.originalname)}`;

  try {
    const r2Config = getR2Config();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const r2Client = await getR2Client();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: objectKey,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      }),
    );

    return prisma.entregaResumen.update({
      where: { id: entrega.id },
      data: {
        urlR2: objectKey,
        entregadoEn: new Date(),
        estado: "ENTREGADO",
      },
    });
  } finally {
    await fs.promises.rm(file.path, { force: true });
  }
}

export async function updateSummaryDeadline(
  summaryId: string,
  input: UpdateSummaryDeadlineInput,
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const entrega = await prisma.entregaResumen.findUnique({
    where: { id: summaryId },
    select: { id: true },
  });

  if (!entrega) {
    throw new NotFoundError("Entrega no encontrada");
  }

  return prisma.entregaResumen.update({
    where: { id: summaryId },
    data: { fechaLimite: input.fechaLimite },
  });
}

export async function reviewSummary(summaryId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const entrega = await prisma.entregaResumen.findUnique({
    where: { id: summaryId },
    select: { id: true },
  });

  if (!entrega) {
    throw new NotFoundError("Entrega no encontrada");
  }

  return prisma.entregaResumen.update({
    where: { id: summaryId },
    data: { estado: "REVISADO" },
  });
}

export async function uploadSessionContent(
  sessionId: string,
  file: Express.Multer.File,
  user: AuthUser,
) {
  if (user.rol !== Rol.ADMIN && user.rol !== Rol.PROFESOR) {
    await fs.promises.rm(file.path, { force: true });
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true, cursoId: true },
  });

  if (!session) {
    await fs.promises.rm(file.path, { force: true });
    throw new NotFoundError("Sesion no encontrada");
  }

  if (user.rol === Rol.PROFESOR) {
    await ensureProfessorOwnsCourse(session.cursoId, user.id);
  }

  const objectKey = `capturas/${sessionId}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";

  try {
    const r2Config = getR2Config();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const r2Client = await getR2Client();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: objectKey,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      }),
    );

    return prisma.material.create({
      data: {
        nombre: file.originalname,
        cursoId: session.cursoId,
        sesionId: sessionId,
        profesorId: user.id,
        urlR2: objectKey,
        tipoArchivo: extension,
        tamanoBytes: BigInt(file.size),
        tipo: "CAPTURA_PIZARRA",
      },
    });
  } finally {
    await fs.promises.rm(file.path, { force: true });
  }
}

async function ensureCanAccessCourse(courseId: string, user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    await ensureCourseExists(courseId);
    return;
  }

  if (user.rol === Rol.PROFESOR) {
    const course = await prisma.curso.findFirst({
      where: { id: courseId, profesorId: user.id, activo: true },
      select: { id: true },
    });
    if (!course) throw new ForbiddenError();
    return;
  }

  const enrollment = await prisma.inscripcion.findFirst({
    where: {
      cursoId: courseId,
      estudianteId: user.id,
      curso: { activo: true },
    },
    select: { id: true },
  });
  if (!enrollment) throw new ForbiddenError();
}

async function ensureCourseExists(courseId: string) {
  const course = await prisma.curso.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) throw new NotFoundError("Curso no encontrado");
}

async function ensureProfessorOwnsCourse(courseId: string, professorId: string) {
  const course = await prisma.curso.findFirst({
    where: { id: courseId, profesorId: professorId, activo: true },
    select: { id: true },
  });
  if (!course) throw new ForbiddenError();
}

function sanitizeFileName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}
