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

export const uploadForumSchema = z.object({
  dia: z.coerce.number().int().min(1).max(3),
});

export const diaParamSchema = z.object({
  id: z.string().min(1),
  dia: z.coerce.number().int().min(1).max(3),
});

export const reviewForumSchema = z.object({
  nota: z.number().min(0).max(20).nullable(),
});

export type UploadForumInput = z.infer<typeof uploadForumSchema>;
export type ReviewForumInput = z.infer<typeof reviewForumSchema>;
