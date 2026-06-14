import { Rol } from "@prisma/client";
import { Router } from "express";
import * as gradeController from "../controllers/grade.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const gradeRoutes = Router();

gradeRoutes.use(authMiddleware);

gradeRoutes.get("/", gradeController.listSummaries);
gradeRoutes.get("/timeline", gradeController.getTimeline);
gradeRoutes.get("/config/:cursoId", requireRole(Rol.ADMIN), gradeController.getConfig);
gradeRoutes.patch("/config/:cursoId", requireRole(Rol.ADMIN), gradeController.updateConfig);
gradeRoutes.post("/manual", requireRole(Rol.PROFESOR), gradeController.createManual);
gradeRoutes.patch("/manual/:id", requireRole(Rol.PROFESOR), gradeController.updateManual);
gradeRoutes.delete("/manual/:id", requireRole(Rol.PROFESOR), gradeController.removeManual);
gradeRoutes.get("/attendance", gradeController.listAttendance);
gradeRoutes.post("/attendance", requireRole(Rol.ADMIN), gradeController.setAttendance);
