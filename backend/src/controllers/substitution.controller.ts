import type { Request, Response, NextFunction } from "express";
import * as substitutionService from "../services/substitution.service.js";
import { z } from "zod";

export async function listEligible(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await substitutionService.listEligible(_req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function enable(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      estudianteId: z.string().min(1),
      cursoId: z.string().min(1),
    });
    const { estudianteId, cursoId } = schema.parse(req.body);
    const result = await substitutionService.enableSubstitution(estudianteId, cursoId, req.user!);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}
