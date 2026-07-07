import { TipoCurso } from "@prisma/client";
import { z } from "zod";

export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

export const courseEnrollmentParamSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
});

export const enrollStudentSchema = z.object({
  estudianteId: z.string().min(1),
});

export const createCourseSchema = z.object({
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().max(500).optional(),
  ciclo: z.number().int().min(1).max(2),
  anio: z.number().int().min(2020).max(2100),
  profesorId: z.string().min(1),
  tipo: z.nativeEnum(TipoCurso).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  activo: z.boolean().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
