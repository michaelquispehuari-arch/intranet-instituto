import type { NextFunction, Request, Response } from "express";
import {
  contentIdParamSchema,
  listContentQuerySchema,
  uploadContentSchema,
} from "../schemas/content.schema.js";
import * as contentService from "../services/content.service.js";
import { ForbiddenError, UnauthorizedError } from "../utils/http-error.js";

function getRequestUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError("Sesion no valida");
  }

  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listContentQuerySchema.parse(req.query);
    const materials = await contentService.listContent(query, getRequestUser(req));
    res.json({ materials });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contentIdParamSchema.parse(req.params);
    const material = await contentService.getContentById(id, getRequestUser(req));
    res.json({ material });
  } catch (error) {
    next(error);
  }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) throw new ForbiddenError("Se requiere al menos un archivo");
    const input = uploadContentSchema.parse(req.body);
    const materials = await contentService.uploadContentBatch(input, files, getRequestUser(req));
    res.status(201).json({ materials });
  } catch (error) {
    next(error);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contentIdParamSchema.parse(req.params);
    const downloadData = await contentService.createDownloadUrl(id, getRequestUser(req));
    res.json(downloadData);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = contentIdParamSchema.parse(req.params);
    const material = await contentService.deleteContent(id, getRequestUser(req));
    res.json({ material });
  } catch (error) {
    next(error);
  }
}
