import type { Rol } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/http-error.js";

export function requireRole(...allowedRoles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError("Sesion no valida"));
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}
