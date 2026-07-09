import fs from "node:fs";
import { Prisma, Rol, TipoMaterial } from "@prisma/client";
import type { UploadContentInput, ListContentQuery } from "../schemas/content.schema.js";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";
import { getR2Client, getR2Config } from "../utils/r2.js";

const allowedExtensions = new Set(["pdf", "mp4", "mp3", "docx", "pptx", "xlsx", "jpg", "jpeg", "png"]);

const materialInclude = {
  curso: {
    select: {
      id: true,
      nombre: true,
      profesorId: true,
    },
  },
  profesor: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
    },
  },
} satisfies Prisma.MaterialInclude;

type MaterialWithRelations = Prisma.MaterialGetPayload<{
  include: typeof materialInclude;
}>;

export async function listContent(query: ListContentQuery, user: AuthUser) {
  const courseFilter = {
    ...(query.cursoId ? { cursoId: query.cursoId } : {}),
    ...(query.sesionId ? { sesionId: query.sesionId } : {}),
  };

  const materials = await prisma.material.findMany({
    where: {
      ...courseFilter,
      ...(user.rol === Rol.PROFESOR
        ? { curso: { profesorId: user.id, activo: true } }
        : {}),
      ...(user.rol === Rol.ESTUDIANTE
        ? {
            curso: {
              activo: true,
              inscripciones: {
                some: {
                  estudianteId: user.id,
                },
              },
            },
          }
        : {}),
    },
    orderBy: { creadoEn: "desc" },
    include: materialInclude,
  });

  return materials.map(serializeMaterial);
}

export async function getContentById(contentId: string, user: AuthUser) {
  const material = await findAccessibleMaterial(contentId, user);
  return serializeMaterial(material);
}

export async function uploadContent(input: UploadContentInput, file: Express.Multer.File, user: AuthUser) {
  await ensureCanUploadToCourse(input.cursoId, user);

  const extension = getFileExtension(file.originalname);

  if (!allowedExtensions.has(extension)) {
    await removeLocalFile(file.path);
    throw new ForbiddenError("Tipo de archivo no permitido");
  }

  const objectKey = `materials/${input.cursoId}/${Date.now()}-${sanitizeFileName(file.originalname)}`;

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

    const material = await prisma.material.create({
      data: {
        nombre: input.nombre ?? file.originalname,
        descripcion: input.descripcion,
        cursoId: input.cursoId,
        sesionId: input.sesionId ?? null,
        profesorId: user.id,
        urlR2: objectKey,
        tipoArchivo: extension,
        tamanoBytes: BigInt(file.size),
        tipo: input.tipo ?? TipoMaterial.MATERIAL_CURSO,
      },
      include: materialInclude,
    });

    return serializeMaterial(material);
  } finally {
    await removeLocalFile(file.path);
  }
}

export async function uploadContentBatch(input: UploadContentInput, files: Express.Multer.File[], user: AuthUser) {
  await ensureCanUploadToCourse(input.cursoId, user);
  const results: ReturnType<typeof serializeMaterial>[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const extension = getFileExtension(file.originalname);
    if (!allowedExtensions.has(extension)) {
      await removeLocalFile(file.path);
      continue;
    }
    const nombre = input.nombre
      ? (files.length > 1 ? `${input.nombre} (${index + 1})` : input.nombre)
      : file.originalname;
    const objectKey = `materials/${input.cursoId}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
    try {
      const r2Config = getR2Config();
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const r2Client = await getR2Client();
      await r2Client.send(new PutObjectCommand({
        Bucket: r2Config.bucketName,
        Key: objectKey,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      }));
      const material = await prisma.material.create({
        data: {
          nombre,
          descripcion: input.descripcion,
          cursoId: input.cursoId,
          sesionId: input.sesionId ?? null,
          profesorId: user.id,
          urlR2: objectKey,
          tipoArchivo: extension,
          tamanoBytes: BigInt(file.size),
          tipo: input.tipo ?? TipoMaterial.MATERIAL_CURSO,
        },
        include: materialInclude,
      });
      results.push(serializeMaterial(material));
    } finally {
      await removeLocalFile(file.path);
    }
  }
  return results;
}

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export async function createDownloadUrl(contentId: string, user: AuthUser) {
  const material = await findAccessibleMaterial(contentId, user);
  const r2Config = getR2Config();
  const [{ GetObjectCommand }, { getSignedUrl }, r2Client] = await Promise.all([
    import("@aws-sdk/client-s3"),
    import("@aws-sdk/s3-request-presigner"),
    getR2Client(),
  ]);

  // PDF y video tienen visor nativo del navegador con boton de descarga propio;
  // una imagen abierta directo no muestra ningun control, asi que se fuerza la
  // descarga solo para imagenes.
  const isImage = imageExtensions.has(material.tipoArchivo.toLowerCase());
  const filename = `${material.nombre.replace(/["\r\n]/g, "").slice(0, 150)}.${material.tipoArchivo}`;

  const url = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: material.urlR2,
      ...(isImage ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {}),
    }),
    { expiresIn: 15 * 60 },
  );

  return {
    material: serializeMaterial(material),
    url,
    expiresInSeconds: 15 * 60,
  };
}

export async function deleteContent(contentId: string, user: AuthUser) {
  const material = await findAccessibleMaterial(contentId, user);

  if (user.rol !== Rol.ADMIN && material.profesorId !== user.id) {
    throw new ForbiddenError();
  }

  const r2Config = getR2Config();
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const r2Client = await getR2Client();

  await prisma.material.delete({
    where: { id: material.id },
  });

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: r2Config.bucketName,
      Key: material.urlR2,
    }),
  );

  return serializeMaterial(material);
}

async function findAccessibleMaterial(contentId: string, user: AuthUser) {
  const material = await prisma.material.findUnique({
    where: { id: contentId },
    include: {
      ...materialInclude,
      curso: {
        include: {
          inscripciones: {
            select: { estudianteId: true },
          },
        },
      },
    },
  });

  if (!material) {
    throw new NotFoundError("Material no encontrado");
  }

  if (user.rol === Rol.ADMIN) {
    return material;
  }

  if (user.rol === Rol.PROFESOR && material.curso.profesorId === user.id) {
    return material;
  }

  const isEnrolled = material.curso.inscripciones.some(
    (inscripcion) => inscripcion.estudianteId === user.id,
  );

  if (user.rol === Rol.ESTUDIANTE && isEnrolled) {
    return material;
  }

  throw new ForbiddenError();
}

async function ensureCanUploadToCourse(courseId: string, user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    const course = await prisma.curso.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      throw new ForbiddenError("Curso no encontrado");
    }

    return;
  }

  const course = await prisma.curso.findFirst({
    where: {
      id: courseId,
      profesorId: user.id,
      activo: true,
    },
    select: { id: true },
  });

  if (!course) {
    throw new ForbiddenError("Curso no encontrado o no asignado al profesor");
  }
}

function serializeMaterial(material: MaterialWithRelations) {
  return {
    ...material,
    tamanoBytes: material.tamanoBytes.toString(),
  };
}

function getFileExtension(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension ?? "";
}

function sanitizeFileName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function removeLocalFile(filePath: string) {
  await fs.promises.rm(filePath, { force: true });
}
