import { Rol } from "@prisma/client";
import { Router } from "express";
import * as sessionController from "../controllers/session.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const sessionRoutes = Router();
export const sessionDetailRoutes = Router();
export const summaryRoutes = Router();

sessionRoutes.use(authMiddleware);
sessionDetailRoutes.use(authMiddleware);
summaryRoutes.use(authMiddleware);

// /api/courses/:id/sessions
sessionRoutes.get("/", sessionController.listByCourse);
sessionRoutes.post("/", requireRole(Rol.ADMIN), sessionController.create);

// /api/sessions/:id
sessionDetailRoutes.get("/:id", sessionController.getById);
sessionDetailRoutes.patch("/:id", requireRole(Rol.ADMIN), sessionController.update);
sessionDetailRoutes.get("/:id/attendance", sessionController.listAttendance);
sessionDetailRoutes.post("/:id/attendance", requireRole(Rol.ADMIN), sessionController.upsertAttendance);
sessionDetailRoutes.get("/:id/summaries", sessionController.listSummaries);
sessionDetailRoutes.post("/:id/summaries/require", requireRole(Rol.ADMIN), sessionController.requireSummaries);

// /api/summaries/:id
summaryRoutes.patch("/:id/deadline", requireRole(Rol.ADMIN), sessionController.updateSummaryDeadline);
summaryRoutes.patch("/:id/review", requireRole(Rol.ADMIN), sessionController.reviewSummary);
