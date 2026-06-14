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

export const attendanceGradeQuerySchema = z.object({
  cursoId: z.string().min(1).optional(),
  estudianteId: z.string().min(1).optional(),
});

export const setAttendanceGradeSchema = z.object({
  estudianteId: z.string().min(1),
  cursoId: z.string().min(1),
  notaAsistencia: z.number().min(0).max(20).nullable(),
});

export const updateGradeConfigSchema = z
  .object({
    pesoAsistencia: z.number().min(0).max(1).optional(),
    pesoAcademico: z.number().min(0).max(1).optional(),
    notaAprobatoria: z.number().min(0).max(20).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "Debe enviar al menos un campo",
  });

export type GradeQuery = z.infer<typeof gradeQuerySchema>;
export type CreateManualGradeInput = z.infer<typeof createManualGradeSchema>;
export type UpdateManualGradeInput = z.infer<typeof updateManualGradeSchema>;
export type AttendanceGradeQuery = z.infer<typeof attendanceGradeQuerySchema>;
export type SetAttendanceGradeInput = z.infer<typeof setAttendanceGradeSchema>;
export type UpdateGradeConfigInput = z.infer<typeof updateGradeConfigSchema>;
