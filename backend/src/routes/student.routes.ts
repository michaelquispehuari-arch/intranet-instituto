import { Rol } from "@prisma/client";
import { Router } from "express";
import * as studentController from "../controllers/student.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const studentRoutes = Router();

studentRoutes.use(authMiddleware);
studentRoutes.use(requireRole(Rol.ADMIN));

studentRoutes.get("/", studentController.list);
studentRoutes.post("/", studentController.create);
studentRoutes.patch("/:id", studentController.update);
studentRoutes.delete("/:id", studentController.remove);
studentRoutes.post("/import", studentController.importCsv);
