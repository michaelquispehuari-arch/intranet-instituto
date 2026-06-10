import type { NextFunction, Request, Response } from "express";
import {
  createExamSchema,
  examIdParamSchema,
  submitExamSchema,
} from "../schemas/exam.schema.js";
import * as examService from "../services/exam.service.js";
import { UnauthorizedError } from "../utils/http-error.js";

function getRequestUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError("Sesion no valida");
  }

  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const exams = await examService.listExams(getRequestUser(req));
    res.json({ exams });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await examService.getExamById(id, getRequestUser(req));
    res.json({ exam });
  } catch (error) {
    next(error);
  }
}

export async function results(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const data = await examService.getExamResults(id, getRequestUser(req));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createExamSchema.parse(req.body);
    const exam = await examService.createExam(input, getRequestUser(req));
    res.status(201).json({ exam });
  } catch (error) {
    next(error);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await examService.publishExam(id, getRequestUser(req));
    res.json({ exam });
  } catch (error) {
    next(error);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = examIdParamSchema.parse(req.params);
    const input = submitExamSchema.parse(req.body);
    const submission = await examService.submitExam(id, input, getRequestUser(req));
    res.json({ submission });
  } catch (error) {
    next(error);
  }
}
