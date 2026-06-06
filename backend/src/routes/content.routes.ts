import { Rol } from "@prisma/client";
import { Router } from "express";
import * as contentController from "../controllers/content.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";
import { uploadMaterialFile } from "../middleware/upload.middleware.js";

export const contentRoutes = Router();

contentRoutes.use(authMiddleware);

contentRoutes.get("/", contentController.list);
contentRoutes.get("/:id", contentController.getById);
contentRoutes.post(
  "/",
  requireRole(Rol.PROFESOR),
  uploadMaterialFile.single("file"),
  contentController.upload,
);
contentRoutes.get("/:id/download", contentController.download);
contentRoutes.delete("/:id", requireRole(Rol.ADMIN, Rol.PROFESOR), contentController.remove);
