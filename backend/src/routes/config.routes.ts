import { Rol } from "@prisma/client";
import { Router } from "express";
import * as configController from "../controllers/config.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const configRoutes = Router();

configRoutes.use(authMiddleware);

configRoutes.get("/zoom", configController.getZoom);
configRoutes.patch("/zoom", requireRole(Rol.ADMIN), configController.updateZoom);
