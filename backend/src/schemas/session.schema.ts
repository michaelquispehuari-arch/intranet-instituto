import { EstadoAsistencia } from "@prisma/client";
import { z } from "zod";

export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

export const sessionIdParamSchema = z.object({
  id: z.string().min(1),
});

const grabacionUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https?:\/\/.+/.test(v), { message: "El enlace debe comenzar con https://" });

export const createSessionSchema = z.object({
  titulo: z.string().trim().min(1).max(150),
  enlaceGrabacion: grabacionUrl,
  fecha: z.coerce.date().optional(),
  orden: z.coerce.number().int().min(1).optional(),
});

export const updateSessionSchema = z.object({
  titulo: z.string().trim().min(1).max(150).optional(),
  fecha: z.coerce.date().optional(),
  enlaceGrabacion: z.string().trim().max(500).nullable().optional()
    .refine((v) => v == null || !v || /^https?:\/\/.+/.test(v), { message: "El enlace debe comenzar con https://" }),
  orden: z.number().int().min(1).optional(),
  fechaLimiteEntrega: z.coerce.date().nullable().optional(),
});

export const upsertSessionAttendanceSchema = z.object({
  asistencias: z
    .array(
      z.object({
        estudianteId: z.string().min(1),
        estado: z.nativeEnum(EstadoAsistencia),
        observacion: z.string().trim().max(300).optional(),
      }),
    )
    .min(1),
});

export const requireSummarySchema = z.object({
  estudianteIds: z.array(z.string().min(1)).min(1),
});

export const updateSummaryDeadlineSchema = z.object({
  fechaLimite: z.coerce.date().nullable(),
});

export const reviewSummarySchema = z.object({
  notaTranscripcion: z.number().min(0).max(20).optional().nullable(),
});

export const summaryIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type UpsertSessionAttendanceInput = z.infer<typeof upsertSessionAttendanceSchema>;
export type RequireSummaryInput = z.infer<typeof requireSummarySchema>;
export type UpdateSummaryDeadlineInput = z.infer<typeof updateSummaryDeadlineSchema>;
