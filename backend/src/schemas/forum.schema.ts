import { z } from "zod";

export const courseIdParamSchema = z.object({
  id: z.string().min(1),
});

export const studentIdParamSchema = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
});

export const forumIdParamSchema = z.object({
  id: z.string().min(1),
});

// Un solo Forum por curso (Forum de la semana) — el "dia" queda fijo en 1.
export const FORUM_DIA = 1;

export const diaParamSchema = z.object({
  id: z.string().min(1),
  dia: z.coerce.number().int().min(1).max(1),
});

export const reviewForumSchema = z.object({
  nota: z.number().min(0).max(20).nullable(),
});

export type ReviewForumInput = z.infer<typeof reviewForumSchema>;
