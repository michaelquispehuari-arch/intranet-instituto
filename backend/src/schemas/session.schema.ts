import { EstadoAsistencia } from "@prisma/client";
import { z } from "zod";

export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

export const sessionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createSessionSchema = z.object({
  fecha: z.coerce.date(),
  titulo: z.string().trim().min(1).max(150),
  orden: z.number().int().min(1),
  enlaceGrabacion: z.string().url().optional().or(z.literal("")),
});

export const updateSessionSchema = z.object({
  titulo: z.string().trim().min(1).max(150).optional(),
  fecha: z.coerce.date().optional(),
  enlaceGrabacion: z.string().url().optional().nullable(),
  orden: z.number().int().min(1).optional(),
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
  estado: z.literal("REVISADO"),
  notaTranscripcion: z.number().min(0).max(18).optional().nullable(),
});

export const summaryIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type UpsertSessionAttendanceInput = z.infer<typeof upsertSessionAttendanceSchema>;
export type RequireSummaryInput = z.infer<typeof requireSummarySchema>;
export type UpdateSummaryDeadlineInput = z.infer<typeof updateSummaryDeadlineSchema>;
