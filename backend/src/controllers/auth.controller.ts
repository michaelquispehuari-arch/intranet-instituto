import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { loginSchema } from "../schemas/auth.schema.js";
import * as authService from "../services/auth.service.js";

const authCookieName = "auth_token";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.cookie(authCookieName, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    res.clearCookie(authCookieName);
    res.json({ message: "Sesion cerrada" });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
}
