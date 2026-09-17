import fs from "node:fs";
import { Rol, TipoCurso } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/http-error.js";
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

  const nextOrden = input.orden ?? await prisma.sesion.count({ where: { cursoId: courseId } }) + 1;

  return prisma.sesion.create({
    data: {
      cursoId: courseId,
      fecha: input.fecha ?? new Date(),
      titulo: input.titulo,
      orden: nextOrden,
      enlaceGrabacion: input.enlaceGrabacion || null,
    },
  });
}

export async function updateSession(sessionId: string, input: UpdateSessionInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN && user.rol !== Rol.PROFESOR) {
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true, cursoId: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  if (user.rol === Rol.PROFESOR) {
    await ensureProfessorOwnsCourse(session.cursoId, user.id);

    const requestedFields = Object.keys(input).filter(
      (key) => input[key as keyof UpdateSessionInput] !== undefined,
    );
    if (requestedFields.some((field) => field !== "enlaceGrabacion")) {
      throw new ForbiddenError("El profesor solo puede actualizar el enlace de grabacion");
    }
  }

  return prisma.sesion.update({
    where: { id: sessionId },
    data: {
      ...input,
      enlaceGrabacion:
        input.enlaceGrabacion !== undefined
          ? input.enlaceGrabacion || null
          : undefined,
    },
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
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const session = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { id: true, cursoId: true },
  });

  if (!session) {
    throw new NotFoundError("Sesion no encontrada");
  }

  return prisma.entregaResumen.findMany({
    where: { sesionId: sessionId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
    orderBy: { estudiante: { apellido: "asc" } },
  });
}

// Lista, para el panel "Revisar transcripciones" del ADMIN, los alumnos que ya
// subieron al menos una transcripcion en las primeras 3 sesiones del curso
// (mismas sesiones que ve el alumno en su pestaña de Transcripcion). El
// PROFESOR no tiene acceso a esta correccion, solo el ADMIN.
export async function listSummarySubmitters(courseId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const curso = await prisma.curso.findUnique({
    where: { id: courseId },
    select: { id: true, tipo: true },
  });
  if (!curso) throw new NotFoundError("Curso no encontrado");
  if (curso.tipo === TipoCurso.DIPLOMADO) {
    throw new ForbiddenError("Este curso no maneja transcripciones");
  }

  const sesiones = await prisma.sesion.findMany({
    where: { cursoId: courseId },
    orderBy: { orden: "asc" },
    take: 3,
    select: { id: true, orden: true },
  });
  const diaPorSesion = new Map(sesiones.map((s) => [s.id, s.orden]));

  const entregas = await prisma.entregaResumen.findMany({
    where: { sesionId: { in: sesiones.map((s) => s.id) }, entregadoEn: { not: null } },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
    },
    orderBy: { estudiante: { apellido: "asc" } },
  });

  const porEstudiante = new Map<string, { estudiante: typeof entregas[number]["estudiante"]; dias: number[] }>();
  for (const e of entregas) {
    const dia = diaPorSesion.get(e.sesionId);
    if (dia === undefined) continue;
    const actual = porEstudiante.get(e.estudianteId);
    if (actual) {
      actual.dias.push(dia);
    } else {
      porEstudiante.set(e.estudianteId, { estudiante: e.estudiante, dias: [dia] });
    }
  }

  return Array.from(porEstudiante.values()).map((v) => ({
    ...v,
    dias: v.dias.sort((a, b) => a - b),
  }));
}

// Entregas de transcripcion de un alumno (dia 1/2/3 = orden de sesion) para
// que el ADMIN las revise y coloque la nota (NT) desde el panel de correccion.
export async function getStudentSummaries(courseId: string, studentId: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const curso = await prisma.curso.findUnique({
    where: { id: courseId },
    select: { id: true, tipo: true },
  });
  if (!curso) throw new NotFoundError("Curso no encontrado");
  if (curso.tipo === TipoCurso.DIPLOMADO) {
    throw new ForbiddenError("Este curso no maneja transcripciones");
  }

  const sesiones = await prisma.sesion.findMany({
    where: { cursoId: courseId },
    orderBy: { orden: "asc" },
    take: 3,
    select: { id: true, orden: true, titulo: true },
  });

  const entregas = await prisma.entregaResumen.findMany({
    where: { sesionId: { in: sesiones.map((s) => s.id) }, estudianteId: studentId },
    select: { id: true, sesionId: true, urlR2: true, entregadoEn: true, notaTranscripcion: true, estado: true },
  });
  const entregaPorSesion = new Map(entregas.map((e) => [e.sesionId, e]));

  return sesiones
    .map((s) => {
      const e = entregaPorSesion.get(s.id);
      if (!e) return null;
      let archivosCount = 0;
      if (e.urlR2) {
        try {
          const parsed = JSON.parse(e.urlR2);
          archivosCount = Array.isArray(parsed) ? parsed.length : 1;
        } catch {
          archivosCount = 1;
        }
      }
      return {
        id: e.id,
        dia: s.orden,
        titulo: s.titulo,
        archivosCount,
        entregadoEn: e.entregadoEn,
        notaTranscripcion: e.notaTranscripcion,
        estado: e.estado,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.dia - b.dia);
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

export async function selfSubmitSummary(sesionId: string, user: AuthUser) {
  if (user.rol !== Rol.ESTUDIANTE) throw new ForbiddenError();

  const sesion = await prisma.sesion.findUnique({
    where: { id: sesionId },
    select: { id: true, cursoId: true },
  });
  if (!sesion) throw new NotFoundError("Sesión no encontrada");

  const inscripcion = await prisma.inscripcion.findUnique({
    where: { estudianteId_cursoId: { estudianteId: user.id, cursoId: sesion.cursoId } },
    select: { id: true },
  });
  if (!inscripcion) throw new ForbiddenError();

  return prisma.entregaResumen.upsert({
    where: { sesionId_estudianteId: { sesionId, estudianteId: user.id } },
    create: { sesionId, estudianteId: user.id, estado: "ENTREGADO", entregadoEn: new Date(), requerido: false },
    update: { estado: "ENTREGADO", entregadoEn: new Date() },
  });
}

export async function reviewSummary(summaryId: string, notaTranscripcion: number | null | undefined, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) {
    throw new ForbiddenError();
  }

  const entrega = await prisma.entregaResumen.findUnique({
    where: { id: summaryId },
    select: { id: true, sesion: { select: { curso: { select: { tipo: true } } } } },
  });

  if (!entrega) {
    throw new NotFoundError("Entrega no encontrada");
  }

  if (entrega.sesion.curso.tipo !== TipoCurso.DIPLOMADO && typeof notaTranscripcion === "number" && notaTranscripcion > 18) {
    throw new ValidationError("La nota de transcripcion para justificar una falta no puede superar 18.");
  }

  return prisma.entregaResumen.update({
    where: { id: summaryId },
    data: {
      estado: "REVISADO",
      ...(notaTranscripcion !== undefined ? { notaTranscripcion } : {}),
    },
  });
}

export async function selfUploadSummary(
  sessionId: string,
  files: Express.Multer.File[],
  user: AuthUser,
) {
  const sesion = await prisma.sesion.findUnique({
    where: { id: sessionId },
    select: { cursoId: true, curso: { select: { fechaLimiteEntrega: true } } },
  });
  if (!sesion) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new NotFoundError("Sesion no encontrada");
  }
  await ensureCanAccessCourse(sesion.cursoId, user);

  if (sesion.curso.fechaLimiteEntrega && new Date() > sesion.curso.fechaLimiteEntrega) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError("El plazo de entrega ha vencido");
  }

  const entregaExistente = await prisma.entregaResumen.findUnique({
    where: { sesionId_estudianteId: { sesionId: sessionId, estudianteId: user.id } },
    select: { fechaLimite: true },
  });

  if (entregaExistente?.fechaLimite && new Date() > entregaExistente.fechaLimite) {
    await Promise.all(files.map((f) => fs.promises.rm(f.path, { force: true })));
    throw new ForbiddenError("El plazo de entrega ha vencido");
  }

  const r2Config = getR2Config();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const r2Client = await getR2Client();
  const objectKeys: string[] = [];

  for (const file of files) {
    const key = `resumenes/${sessionId}/${user.id}-${Date.now()}-${sanitizeFileName(file.originalname)}`;
    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      }));
      objectKeys.push(key);
    } finally {
      await fs.promises.rm(file.path, { force: true });
    }
  }

  return prisma.entregaResumen.upsert({
    where: { sesionId_estudianteId: { sesionId: sessionId, estudianteId: user.id } },
    create: { sesionId: sessionId, estudianteId: user.id, estado: "ENTREGADO", entregadoEn: new Date(), requerido: false, urlR2: JSON.stringify(objectKeys) },
    update: { urlR2: JSON.stringify(objectKeys), entregadoEn: new Date(), estado: "ENTREGADO" },
  });
}

export async function getSummaryDownloadUrls(summaryId: string, user: AuthUser) {
  const entrega = await prisma.entregaResumen.findUnique({
    where: { id: summaryId },
    include: {
      sesion: { select: { cursoId: true } },
    },
  });
  if (!entrega) throw new NotFoundError("Entrega no encontrada");
  await ensureCanAccessCourse(entrega.sesion.cursoId, user);
  if (!entrega.urlR2) return { urls: [] };

  let keys: string[];
  try {
    keys = JSON.parse(entrega.urlR2);
    if (!Array.isArray(keys)) keys = [entrega.urlR2];
  } catch {
    keys = [entrega.urlR2];
  }

  const r2Config = getR2Config();
  const [{ GetObjectCommand }, { getSignedUrl }, r2Client] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
    getR2Client(),
  ]);

  const urls = await Promise.all(
    keys.map(async (key, i) => ({
      filename: `archivo_${i + 1}.${key.split(".").pop() ?? "file"}`,
      url: await getSignedUrl(r2Client, new GetObjectCommand({ Bucket: r2Config.bucketName, Key: key }), { expiresIn: 900 }),
    })),
  );
  return { urls };
}

export async function getMySummariesForCourse(courseId: string, user: AuthUser) {
  await ensureCanAccessCourse(courseId, user);
  const sesiones = await prisma.sesion.findMany({
    where: { cursoId: courseId },
    select: { id: true },
  });
  return prisma.entregaResumen.findMany({
    where: { sesionId: { in: sesiones.map((s) => s.id) }, estudianteId: user.id },
    select: { sesionId: true, estado: true, urlR2: true, entregadoEn: true, notaTranscripcion: true },
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
