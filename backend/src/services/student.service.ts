import bcrypt from "bcrypt";
import { ModoEstudio, Rol } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
import type { AuthUser } from "../types/auth.js";

export type CreateStudentInput = {
  email: string;
  nombre: string;
  apellido: string;
  codigo?: string;
  modo?: ModoEstudio;
  iglesia?: string;
  pais?: string;
  semestreIngreso?: number;
  anioIngreso?: number;
  dni: string;
  telefono?: string;
  fechaNacimiento?: string;
  coordinador?: string;
};

export type UpdateStudentInput = Partial<Omit<CreateStudentInput, "email">> & {
  email?: string;
  activo?: boolean;
};

const studentSelect = {
  id: true,
  email: true,
  nombre: true,
  apellido: true,
  activo: true,
  creadoEn: true,
  codigo: true,
  modo: true,
  iglesia: true,
  pais: true,
  semestreIngreso: true,
  anioIngreso: true,
  dni: true,
  telefono: true,
  fechaNacimiento: true,
  coordinador: true,
};

export async function listStudents(query: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const where = query
    ? {
        rol: Rol.ESTUDIANTE,
        OR: [
          { codigo: { contains: query, mode: "insensitive" as const } },
          { nombre: { contains: query, mode: "insensitive" as const } },
          { apellido: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : { rol: Rol.ESTUDIANTE };

  return prisma.usuario.findMany({ where, select: studentSelect, orderBy: [{ apellido: "asc" }, { nombre: "asc" }] });
}

export async function createStudent(input: CreateStudentInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const passwordHash = await bcrypt.hash(input.dni, 12);

  return prisma.usuario.create({
    data: {
      email: input.email,
      passwordHash,
      nombre: input.nombre,
      apellido: input.apellido,
      rol: Rol.ESTUDIANTE,
      codigo: input.codigo || null,
      modo: input.modo ?? ModoEstudio.SINCRONICO,
      iglesia: input.iglesia || null,
      pais: input.pais || null,
      semestreIngreso: input.semestreIngreso ?? null,
      anioIngreso: input.anioIngreso ?? null,
      dni: input.dni || null,
      telefono: input.telefono || null,
      fechaNacimiento: input.fechaNacimiento ? new Date(input.fechaNacimiento) : null,
      coordinador: input.coordinador || null,
    },
    select: studentSelect,
  });
}

export async function updateStudent(id: string, input: UpdateStudentInput, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const exists = await prisma.usuario.findFirst({ where: { id, rol: Rol.ESTUDIANTE } });
  if (!exists) throw new NotFoundError("Estudiante no encontrado");

  const data: Record<string, unknown> = {
    nombre: input.nombre,
    apellido: input.apellido,
    email: input.email,
    activo: input.activo,
    codigo: input.codigo !== undefined ? input.codigo || null : undefined,
    modo: input.modo,
    iglesia: input.iglesia !== undefined ? input.iglesia || null : undefined,
    pais: input.pais !== undefined ? input.pais || null : undefined,
    semestreIngreso: input.semestreIngreso !== undefined ? input.semestreIngreso || null : undefined,
    anioIngreso: input.anioIngreso !== undefined ? input.anioIngreso || null : undefined,
    dni: input.dni !== undefined ? input.dni || null : undefined,
    telefono: input.telefono !== undefined ? input.telefono || null : undefined,
    fechaNacimiento: input.fechaNacimiento !== undefined
      ? input.fechaNacimiento ? new Date(input.fechaNacimiento) : null
      : undefined,
    coordinador: input.coordinador !== undefined ? input.coordinador || null : undefined,
  };

  if (input.dni !== undefined && input.dni.trim().length > 0) {
    data.passwordHash = await bcrypt.hash(input.dni, 12);
  }

  // Remove undefined keys
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }

  return prisma.usuario.update({ where: { id }, data, select: studentSelect });
}

export async function deactivateStudent(id: string, user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const exists = await prisma.usuario.findFirst({ where: { id, rol: Rol.ESTUDIANTE } });
  if (!exists) throw new NotFoundError("Estudiante no encontrado");

  return prisma.usuario.update({
    where: { id },
    data: { activo: false },
    select: studentSelect,
  });
}

export async function importStudents(rows: CreateStudentInput[], user: AuthUser) {
  if (user.rol !== Rol.ADMIN) throw new ForbiddenError();

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    try {
      const existsByEmail = await prisma.usuario.findUnique({ where: { email: row.email } });
      if (existsByEmail) { results.skipped++; continue; }

      if (row.codigo) {
        const existsByCodigo = await prisma.usuario.findUnique({ where: { codigo: row.codigo } });
        if (existsByCodigo) { results.skipped++; continue; }
      }

      const passwordHash = await bcrypt.hash(row.dni, 12);
      await prisma.usuario.create({
        data: {
          email: row.email,
          passwordHash,
          nombre: row.nombre,
          apellido: row.apellido,
          rol: Rol.ESTUDIANTE,
          codigo: row.codigo || null,
          modo: row.modo ?? ModoEstudio.SINCRONICO,
          iglesia: row.iglesia || null,
          pais: row.pais || null,
          semestreIngreso: row.semestreIngreso ?? null,
          anioIngreso: row.anioIngreso ?? null,
          dni: row.dni || null,
          telefono: row.telefono || null,
          fechaNacimiento: row.fechaNacimiento ? new Date(row.fechaNacimiento) : null,
          coordinador: row.coordinador || null,
        },
      });
      results.created++;
    } catch (e: unknown) {
      results.errors.push(`${row.email}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return results;
}
