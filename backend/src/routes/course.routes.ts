import { Rol } from "@prisma/client";
import { Router } from "express";
import * as courseController from "../controllers/course.controller.js";
import * as gradesSheetController from "../controllers/grades-sheet.controller.js";
import * as sessionController from "../controllers/session.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const courseRoutes = Router();

courseRoutes.use(authMiddleware);

courseRoutes.get("/", courseController.list);
courseRoutes.get("/:id", courseController.getById);
courseRoutes.post("/", requireRole(Rol.ADMIN), courseController.create);
courseRoutes.post("/:id/enrollments", requireRole(Rol.ADMIN), courseController.enroll);
courseRoutes.patch("/:id", requireRole(Rol.ADMIN), courseController.update);
courseRoutes.delete("/:id/enrollments/:studentId", requireRole(Rol.ADMIN), courseController.unenroll);
courseRoutes.delete("/:id", requireRole(Rol.ADMIN), courseController.remove);

courseRoutes.get("/:id/grades-sheet", requireRole(Rol.ADMIN), gradesSheetController.getSheet);
courseRoutes.post("/:id/grades-sheet", requireRole(Rol.ADMIN), gradesSheetController.upsertRow);
courseRoutes.post("/:id/grades-sheet/import", requireRole(Rol.ADMIN), gradesSheetController.importSheet);
courseRoutes.post("/:id/grades/publish", requireRole(Rol.ADMIN), gradesSheetController.publishGrades);
courseRoutes.get("/:id/grades", requireRole(Rol.PROFESOR), gradesSheetController.getPublishedGrades);
courseRoutes.get("/:id/summaries/mine", requireRole(Rol.ESTUDIANTE), sessionController.getMySummariesForCourse);
