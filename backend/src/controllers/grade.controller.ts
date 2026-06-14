import type { NextFunction, Request, Response } from "express";
import {
  attendanceGradeQuerySchema,
  createManualGradeSchema,
  gradeConfigParamSchema,
  gradeQuerySchema,
  manualGradeIdParamSchema,
  setAttendanceGradeSchema,
  updateGradeConfigSchema,
  updateManualGradeSchema,
} from "../schemas/grade.schema.js";
import * as gradeService from "../services/grade.service.js";
import { UnauthorizedError } from "../utils/http-error.js";

function getRequestUser(req: Request) {
  if (!req.user) throw new UnauthorizedError("Sesion no valida");
  return req.user;
}

export async function listSummaries(req: Request, res: Response, next: NextFunction) {
  try {
    const query = gradeQuerySchema.parse(req.query);
    const summaries = await gradeService.listGradeSummaries(query, getRequestUser(req));
    res.json({ summaries });
  } catch (error) {
    next(error);
  }
}

export async function getTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const timeline = await gradeService.getTimeline(getRequestUser(req));
    res.json(timeline);
  } catch (error) {
    next(error);
  }
}

export async function createManual(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createManualGradeSchema.parse(req.body);
    const grade = await gradeService.createManualGrade(input, getRequestUser(req));
    res.status(201).json({ grade });
  } catch (error) {
    next(error);
  }
}

export async function updateManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = manualGradeIdParamSchema.parse(req.params);
    const input = updateManualGradeSchema.parse(req.body);
    const grade = await gradeService.updateManualGrade(id, input, getRequestUser(req));
    res.json({ grade });
  } catch (error) {
    next(error);
  }
}

export async function removeManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = manualGradeIdParamSchema.parse(req.params);
    const grade = await gradeService.deleteManualGrade(id, getRequestUser(req));
    res.json({ grade });
  } catch (error) {
    next(error);
  }
}

export async function listAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const query = attendanceGradeQuerySchema.parse(req.query);
    const attendance = await gradeService.listAttendanceGrades(query, getRequestUser(req));
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
}

export async function setAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const input = setAttendanceGradeSchema.parse(req.body);
    const attendance = await gradeService.setAttendanceGrade(input, getRequestUser(req));
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
}

export async function getConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { cursoId } = gradeConfigParamSchema.parse(req.params);
    const config = await gradeService.getGradeConfig(cursoId);
    res.json({ config });
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { cursoId } = gradeConfigParamSchema.parse(req.params);
    const input = updateGradeConfigSchema.parse(req.body);
    const config = await gradeService.updateGradeConfig(cursoId, input);
    res.json({ config });
  } catch (error) {
    next(error);
  }
}
