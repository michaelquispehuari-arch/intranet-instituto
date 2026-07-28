import { Rol } from "@prisma/client";
import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(100).optional(),
  nombre: z.string().trim().min(2).max(80),
  apellido: z.string().trim().min(2).max(80),
  rol: z.nativeEnum(Rol),
  codigo: z.string().trim().max(30).optional(),
  dni: z.string().trim().max(20).optional(),
  telefono: z.string().trim().max(20).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().trim().email().toLowerCase().optional(),
  password: z.string().min(8).max(100).optional(),
  nombre: z.string().trim().min(2).max(80).optional(),
  apellido: z.string().trim().min(2).max(80).optional(),
  rol: z.nativeEnum(Rol).optional(),
  activo: z.coerce.boolean().optional(),
  codigo: z.string().trim().max(30).optional(),
  dni: z.string().trim().max(20).optional(),
  telefono: z.string().trim().max(20).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
