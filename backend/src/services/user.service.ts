import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, HttpError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";
import type { CreateUserInput, UpdateUserInput } from "../schemas/user.schema.js";

const userSelect = {
  id: true,
  email: true,
  nombre: true,
  apellido: true,
  rol: true,
  activo: true,
  creadoEn: true,
  codigo: true,
  dni: true,
  telefono: true,
  _count: {
    select: {
      cursosComoProfesor: true,
      inscripciones: true,
      examenesSub: true,
      materialesSubidos: true,
    },
  },
} satisfies Prisma.UsuarioSelect;

export async function listUsers() {
  return prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { creadoEn: "desc" }],
    select: userSelect,
  });
}

export async function createUser(input: CreateUserInput) {
  const existingUser = await prisma.usuario.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new HttpError(400, "El email ya esta registrado");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.usuario.create({
    data: {
      email: input.email,
      passwordHash,
      nombre: input.nombre,
      apellido: input.apellido,
      rol: input.rol,
      codigo: input.codigo || null,
      dni: input.dni || null,
      telefono: input.telefono || null,
    },
    select: userSelect,
  });

  return user;
}

export async function updateUser(userId: string, input: UpdateUserInput, actor: AuthUser) {
  await ensureUserExists(userId);

  if (input.activo === false && userId === actor.id) {
    throw new ForbiddenError("No puedes desactivar tu propia cuenta");
  }

  if (input.email) {
    const existingUser = await prisma.usuario.findFirst({
      where: {
        email: input.email,
        id: { not: userId },
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new HttpError(400, "El email ya esta registrado");
    }
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;

  return prisma.usuario.update({
    where: { id: userId },
    data: {
      email: input.email,
      passwordHash,
      nombre: input.nombre,
      apellido: input.apellido,
      rol: input.rol,
      activo: input.activo,
      codigo: input.codigo !== undefined ? input.codigo || null : undefined,
      dni: input.dni !== undefined ? input.dni || null : undefined,
      telefono: input.telefono !== undefined ? input.telefono || null : undefined,
    },
    select: userSelect,
  });
}

export async function deactivateUser(userId: string, actor: AuthUser) {
  if (userId === actor.id) {
    throw new ForbiddenError("No puedes desactivar tu propia cuenta");
  }

  await ensureUserExists(userId);

  return prisma.usuario.update({
    where: { id: userId },
    data: { activo: false },
    select: userSelect,
  });
}

async function ensureUserExists(userId: string) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError("Usuario no encontrado");
  }
}
