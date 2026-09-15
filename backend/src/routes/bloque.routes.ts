import { Rol } from "@prisma/client";
import { Router } from "express";
import * as bloqueController from "../controllers/bloque.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const bloqueRoutes = Router();

bloqueRoutes.use(authMiddleware);
bloqueRoutes.use(requireRole(Rol.ADMIN));

bloqueRoutes.get("/", bloqueController.list);
bloqueRoutes.post("/", bloqueController.create);
bloqueRoutes.post("/:id/finalize", bloqueController.finalize);
