import type { NextFunction, Request, Response } from "express";
import {
  courseIdParamSchema,
  createCourseSchema,
  updateCourseSchema,
} from "../schemas/course.schema.js";
import * as courseService from "../services/course.service.js";
import { UnauthorizedError } from "../utils/http-error.js";

function getRequestUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError("Sesion no valida");
  }

  return req.user;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const courses = await courseService.listCourses(getRequestUser(req));
    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParamSchema.parse(req.params);
    const course = await courseService.getCourseById(id, getRequestUser(req));
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCourseSchema.parse(req.body);
    const course = await courseService.createCourse(input);
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParamSchema.parse(req.params);
    const input = updateCourseSchema.parse(req.body);
    const course = await courseService.updateCourse(id, input);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParamSchema.parse(req.params);
    const course = await courseService.deactivateCourse(id);
    res.json({ course });
  } catch (error) {
    next(error);
  }
}
