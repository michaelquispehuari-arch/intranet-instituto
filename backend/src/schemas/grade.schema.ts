import { EstadoAsistencia } from "@prisma/client";
import { z } from "zod";

export const gradeQuerySchema = z.object({
  cursoId: z.string().min(1).optional(),
  estudianteId: z.string().min(1).optional(),
});

export const manualGradeIdParamSchema = z.object({
  id: z.string().min(1),
});

export const gradeConfigParamSchema = z.object({
  cursoId: z.string().min(1),
});

export const createManualGradeSchema = z.object({
  estudianteId: z.string().min(1),
  cursoId: z.string().min(1),
  valor: z.number().min(0).max(20),
  descripcion: z.string().trim().max(300).optional(),
  fecha: z.coerce.date().optional(),
});

export const updateManualGradeSchema = z.object({
  valor: z.number().min(0).max(20).optional(),
  descripcion: z.string().trim().max(300).optional(),
  fecha: z.coerce.date().optional(),
});

export const attendanceQuerySchema = z.object({
  cursoId: z.string().min(1).optional(),
  estudianteId: z.string().min(1).optional(),
});

export const upsertAttendanceSchema = z.object({
  estudianteId: z.string().min(1),
  cursoId: z.string().min(1),
  fecha: z.coerce.date(),
  estado: z.nativeEnum(EstadoAsistencia),
});

export const updateGradeConfigSchema = z
  .object({
    pesoExamenes: z.number().min(0).max(1).optional(),
    pesoNotasManuales: z.number().min(0).max(1).optional(),
    notaAprobatoria: z.number().min(0).max(20).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Debe enviar al menos un campo",
  });

export type GradeQuery = z.infer<typeof gradeQuerySchema>;
export type CreateManualGradeInput = z.infer<typeof createManualGradeSchema>;
export type UpdateManualGradeInput = z.infer<typeof updateManualGradeSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;
export type UpdateGradeConfigInput = z.infer<typeof updateGradeConfigSchema>;
