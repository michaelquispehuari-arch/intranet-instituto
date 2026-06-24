import { Rol } from "@prisma/client";
import { Router } from "express";
import * as sessionController from "../controllers/session.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

// mergeParams: true needed so /:id from app.use("/api/courses/:id/sessions", ...) reaches req.params
export const sessionRoutes = Router({ mergeParams: true });
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
sessionDetailRoutes.patch("/:id", requireRole(Rol.ADMIN, Rol.PROFESOR), sessionController.update);
sessionDetailRoutes.get("/:id/attendance", sessionController.listAttendance);
sessionDetailRoutes.post("/:id/attendance", requireRole(Rol.ADMIN), sessionController.upsertAttendance);
sessionDetailRoutes.get("/:id/summaries", sessionController.listSummaries);
sessionDetailRoutes.post("/:id/summaries/require", requireRole(Rol.ADMIN), sessionController.requireSummaries);
sessionDetailRoutes.post("/:id/summaries/self-submit", requireRole(Rol.ESTUDIANTE), sessionController.selfSubmitSummary);

// /api/summaries/:id
summaryRoutes.patch("/:id/deadline", requireRole(Rol.ADMIN), sessionController.updateSummaryDeadline);
summaryRoutes.patch("/:id/review", requireRole(Rol.ADMIN, Rol.PROFESOR), sessionController.reviewSummary);
