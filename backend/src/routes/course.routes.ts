import { Rol } from "@prisma/client";
import { Router } from "express";
import * as courseController from "../controllers/course.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const courseRoutes = Router();

courseRoutes.use(authMiddleware);

courseRoutes.get("/", courseController.list);
courseRoutes.get("/:id", courseController.getById);
courseRoutes.post("/", requireRole(Rol.ADMIN), courseController.create);
courseRoutes.patch("/:id", requireRole(Rol.ADMIN), courseController.update);
courseRoutes.delete("/:id", requireRole(Rol.ADMIN), courseController.remove);
