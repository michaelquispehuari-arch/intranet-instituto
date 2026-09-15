import type { NextFunction, Request, Response } from "express";
import { bloqueIdParamSchema, createBloqueSchema } from "../schemas/bloque.schema.js";
import * as bloqueService from "../services/bloque.service.js";

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const bloques = await bloqueService.listBloques();
    res.json({ bloques });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBloqueSchema.parse(req.body);
    const bloque = await bloqueService.createBloque(input);
    res.status(201).json({ bloque });
  } catch (error) {
    next(error);
  }
}

export async function finalize(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = bloqueIdParamSchema.parse(req.params);
    const bloque = await bloqueService.finalizeBloque(id);
    res.json({ bloque });
  } catch (error) {
    next(error);
  }
}
