import type { NextFunction, Request, Response } from "express";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../schemas/user.schema.js";
import * as userService from "../services/user.service.js";
import { UnauthorizedError } from "../utils/http-error.js";

function getRequestUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError("Sesion no valida");
  }

  return req.user;
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await userService.createUser(input);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await userService.updateUser(id, input, getRequestUser(req));
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = userIdParamSchema.parse(req.params);
    const user = await userService.deactivateUser(id, getRequestUser(req));
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
