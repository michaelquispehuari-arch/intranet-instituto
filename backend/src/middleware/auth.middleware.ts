import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { findActiveUserById } from "../services/auth.service.js";
import { UnauthorizedError } from "../utils/http-error.js";

const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
});

function getTokenFromRequest(req: Request): string | null {
  const authorization = req.header("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  const cookieToken = req.cookies?.auth_token;
  return typeof cookieToken === "string" ? cookieToken : null;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      throw new UnauthorizedError("Sesion no valida");
    }

    const decoded = jwtPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET));
    const user = await findActiveUserById(decoded.sub);

    if (!user) {
      throw new UnauthorizedError("Sesion no valida");
    }

    req.user = user;
    next();
  } catch {
    next(new UnauthorizedError("Sesion no valida"));
  }
}
