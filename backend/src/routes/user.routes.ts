import { Rol } from "@prisma/client";
import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

export const userRoutes = Router();

userRoutes.use(authMiddleware, requireRole(Rol.ADMIN));

userRoutes.get("/", userController.list);
userRoutes.post("/", userController.create);
userRoutes.patch("/:id", userController.update);
userRoutes.delete("/:id", userController.remove);
