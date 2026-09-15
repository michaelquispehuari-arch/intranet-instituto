import { z } from "zod";

export const bloqueIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createBloqueSchema = z.object({
  nombre: z.string().trim().min(3).max(120),
});

export type CreateBloqueInput = z.infer<typeof createBloqueSchema>;
