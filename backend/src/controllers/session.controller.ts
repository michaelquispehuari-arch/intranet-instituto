import type { Request, Response, NextFunction } from "express";
import * as sessionService from "../services/session.service.js";
import {
  courseIdParamSchema,
  sessionIdParamSchema,
  createSessionSchema,
  updateSessionSchema,
  upsertSessionAttendanceSchema,
  requireSummarySchema,
  reviewSummarySchema,
  updateSummaryDeadlineSchema,
  summaryIdParamSchema,
} from "../schemas/session.schema.js";

export async function listByCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: courseId } = courseIdParamSchema.parse(req.params);
    const sessions = await sessionService.listSessions(courseId, req.user!);
    res.json(sessions);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const session = await sessionService.getSessionById(id, req.user!);
    res.json(session);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: courseId } = courseIdParamSchema.parse(req.params);
    const input = createSessionSchema.parse(req.body);
    const session = await sessionService.createSession(courseId, input, req.user!);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const input = updateSessionSchema.parse(req.body);
    const session = await sessionService.updateSession(id, input, req.user!);
    res.json(session);
  } catch (error) {
    next(error);
  }
}

export async function listAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const attendance = await sessionService.listSessionAttendance(id, req.user!);
    res.json(attendance);
  } catch (error) {
    next(error);
  }
}

export async function upsertAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const input = upsertSessionAttendanceSchema.parse(req.body);
    const result = await sessionService.upsertSessionAttendance(id, input, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listSummaries(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const summaries = await sessionService.listSummaries(id, req.user!);
    res.json(summaries);
  } catch (error) {
    next(error);
  }
}

export async function requireSummaries(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = sessionIdParamSchema.parse(req.params);
    const input = requireSummarySchema.parse(req.body);
    const result = await sessionService.requireSummaries(id, input, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSummaryDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = summaryIdParamSchema.parse(req.params);
    const input = updateSummaryDeadlineSchema.parse(req.body);
    const result = await sessionService.updateSummaryDeadline(id, input, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reviewSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = summaryIdParamSchema.parse(req.params);
    const { notaTranscripcion } = reviewSummarySchema.parse(req.body);
    const result = await sessionService.reviewSummary(id, notaTranscripcion, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
