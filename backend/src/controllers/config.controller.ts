import type { Request, Response, NextFunction } from "express";
import * as configService from "../services/config.service.js";
import { updateZoomSchema } from "../schemas/config.schema.js";

export async function getZoom(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await configService.getZoom();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateZoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { enlaceZoom } = updateZoomSchema.parse(req.body);
    const result = await configService.updateZoom(enlaceZoom);
    res.json({ enlaceZoom: result.valor });
  } catch (error) {
    next(error);
  }
}
