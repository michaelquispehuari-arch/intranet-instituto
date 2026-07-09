import { Rol } from "@prisma/client";
import { Router } from "express";
import * as forumController from "../controllers/forum.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";
import { uploadMaterialFile } from "../middleware/upload.middleware.js";

// mergeParams: true needed so /:id from app.use("/api/courses/:id/forums", ...) reaches req.params
export const courseForumRoutes = Router({ mergeParams: true });
export const forumRoutes = Router();

courseForumRoutes.use(authMiddleware);
forumRoutes.use(authMiddleware);

// /api/courses/:id/forums
courseForumRoutes.get("/", requireRole(Rol.ADMIN), forumController.listSubmitters);
courseForumRoutes.post("/", requireRole(Rol.ESTUDIANTE), uploadMaterialFile.array("files", 10), forumController.uploadForum);
courseForumRoutes.get("/mine", requireRole(Rol.ESTUDIANTE), forumController.getMyForumStatus);
courseForumRoutes.get("/:studentId", requireRole(Rol.ADMIN), forumController.getStudentSubmissions);
courseForumRoutes.delete("/:dia", requireRole(Rol.ESTUDIANTE), forumController.deleteForum);

// /api/forums/:id
forumRoutes.patch("/:id/review", requireRole(Rol.ADMIN), forumController.reviewForum);
forumRoutes.get("/:id/files", forumController.getForumFileUrls);
