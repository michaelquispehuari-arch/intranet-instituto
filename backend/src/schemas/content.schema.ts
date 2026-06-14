import { TipoMaterial } from "@prisma/client";
import { z } from "zod";

export const contentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listContentQuerySchema = z.object({
  cursoId: z.string().min(1).optional(),
  sesionId: z.string().min(1).optional(),
});

export const uploadContentSchema = z.object({
  nombre: z.string().trim().min(3).max(150).optional(),
  descripcion: z.string().trim().max(500).optional(),
  cursoId: z.string().min(1),
  sesionId: z.string().min(1).optional(),
  tipo: z.nativeEnum(TipoMaterial).optional(),
});

export type ListContentQuery = z.infer<typeof listContentQuerySchema>;
export type UploadContentInput = z.infer<typeof uploadContentSchema>;
