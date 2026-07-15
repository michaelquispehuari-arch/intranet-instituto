import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { loginRateLimit, passwordResetRateLimit } from "../middleware/rate-limit.middleware.js";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimit, authController.login);
authRoutes.post("/logout", authController.logout);
authRoutes.post("/forgot-password", passwordResetRateLimit, authController.forgotPassword);
authRoutes.post("/reset-password", passwordResetRateLimit, authController.resetPassword);
authRoutes.get("/me", authMiddleware, authController.me);
