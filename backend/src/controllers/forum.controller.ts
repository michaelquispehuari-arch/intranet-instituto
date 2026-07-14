import type { Request, Response, NextFunction } from "express";
import * as forumService from "../services/forum.service.js";
import {
  courseIdParamSchema,
  studentIdParamSchema,
  forumIdParamSchema,
  reviewForumSchema,
  diaParamSchema,
  FORUM_DIA,
} from "../schemas/forum.schema.js";

export async function uploadForum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: cursoId } = courseIdParamSchema.parse(req.params);
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      res.status(400).json({ message: "Se requiere al menos un archivo" });
      return;
    }
    const result = await forumService.uploadForum(cursoId, FORUM_DIA, files, req.user!);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteForum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: cursoId, dia } = diaParamSchema.parse(req.params);
    await forumService.deleteForum(cursoId, dia, req.user!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getMyForumStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: cursoId } = courseIdParamSchema.parse(req.params);
    const result = await forumService.getMyForumStatus(cursoId, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listSubmitters(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: cursoId } = courseIdParamSchema.parse(req.params);
    const result = await forumService.listForumSubmitters(cursoId, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getStudentSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: cursoId, studentId } = studentIdParamSchema.parse(req.params);
    const result = await forumService.getStudentSubmissions(cursoId, studentId, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reviewForum(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = forumIdParamSchema.parse(req.params);
    const { nota } = reviewForumSchema.parse(req.body);
    const result = await forumService.reviewForum(id, nota, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getForumFileUrls(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = forumIdParamSchema.parse(req.params);
    const result = await forumService.getForumFileUrls(id, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
