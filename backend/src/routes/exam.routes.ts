import { Rol } from "@prisma/client";
import { Router } from "express";
import * as examController from "../controllers/exam.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const examRoutes = Router();

examRoutes.use(authMiddleware);

examRoutes.get("/", examController.list);
examRoutes.get("/:id/results", examController.results);
examRoutes.get("/:id", examController.getById);
examRoutes.post("/", requireRole(Rol.ADMIN, Rol.PROFESOR), examController.create);
examRoutes.patch("/:id/publish", requireRole(Rol.ADMIN, Rol.PROFESOR), examController.publish);
examRoutes.post("/:id/submit", requireRole(Rol.ESTUDIANTE), examController.submit);
examRoutes.patch("/:id/grade-open", requireRole(Rol.ADMIN), examController.gradeOpen);
