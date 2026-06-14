import { Rol } from "@prisma/client";
import { Router } from "express";
import * as substitutionController from "../controllers/substitution.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const substitutionRoutes = Router();

substitutionRoutes.use(authMiddleware);

substitutionRoutes.get("/eligible", requireRole(Rol.ADMIN), substitutionController.listEligible);
substitutionRoutes.post("/", requireRole(Rol.ADMIN), substitutionController.enable);
