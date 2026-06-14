import { z } from "zod";

export const updateZoomSchema = z.object({
  enlaceZoom: z.string().url().min(1),
});

export type UpdateZoomInput = z.infer<typeof updateZoomSchema>;
