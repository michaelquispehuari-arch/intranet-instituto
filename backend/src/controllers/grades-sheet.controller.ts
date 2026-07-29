import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ModoEstudio } from "@prisma/client";
import * as gradesSheetService from "../services/grades-sheet.service.js";

const courseIdParam = z.object({ id: z.string().min(1) });

const upsertRowSchema = z.object({
  estudianteId: z.string().min(1),
  modo: z.nativeEnum(ModoEstudio),
  numDias: z.number().int().min(1).max(3) as z.ZodType<1 | 2 | 3>,
  celdasCamara: z.object({
    d1c1: z.string().optional(),
    d1c2: z.string().optional(),
    d1c3: z.string().optional(),
    d2c1: z.string().optional(),
    d2c2: z.string().optional(),
    d2c3: z.string().optional(),
    d3c1: z.string().optional(),
    d3c2: z.string().optional(),
    d3c3: z.string().optional(),
  }),
  notaForumManual: z.number().min(0).max(20).nullable().optional(),
  notaExamenNormManual: z.number().min(0).max(20).nullable().optional(),
  notaExamenRecupManual: z.number().min(0).max(20).nullable().optional(),
});

const celdasCamaraSchema = z.object({
  d1c1: z.string().optional(),
  d1c2: z.string().optional(),
  d1c3: z.string().optional(),
  d2c1: z.string().optional(),
  d2c2: z.string().optional(),
  d2c3: z.string().optional(),
  d3c1: z.string().optional(),
  d3c2: z.string().optional(),
  d3c3: z.string().optional(),
});

const importSchema = z.object({
  numDias: z.number().int().min(1).max(3) as z.ZodType<1 | 2 | 3>,
  rows: z.array(z.object({
    // Puede venir vacío (alumnos "libre"/sin código en el CSV, aún no
    // registrados): el service los cuenta como saltados, no se rechazan acá.
    codigo: z.string(),
    nombre: z.string(),
    modo: z.nativeEnum(ModoEstudio).optional(),
    celdasCamara: celdasCamaraSchema,
    notaExamenManual: z.number().min(0).max(20).nullable().optional(),
    notaExamenRecupManual: z.number().min(0).max(20).nullable().optional(),
  })),
});

export async function getSheet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParam.parse(req.params);
    const sheet = await gradesSheetService.getGradesSheet(id, req.user!);
    res.json(sheet);
  } catch (e) { next(e); }
}

export async function upsertRow(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParam.parse(req.params);
    const input = upsertRowSchema.parse(req.body);
    const result = await gradesSheetService.upsertGradeRow(id, input, req.user!);
    res.json(result);
  } catch (e) { next(e); }
}

export async function importSheet(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParam.parse(req.params);
    const { numDias, rows } = importSchema.parse(req.body);
    const result = await gradesSheetService.importGradesSheet(id, numDias, rows, req.user!);
    res.json(result);
  } catch (e) { next(e); }
}

export async function publishGrades(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParam.parse(req.params);
    const result = await gradesSheetService.publishGrades(id, req.user!);
    res.json(result);
  } catch (e) { next(e); }
}

export async function getPublishedGrades(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = courseIdParam.parse(req.params);
    const result = await gradesSheetService.getPublishedGrades(id, req.user!);
    res.json(result);
  } catch (e) { next(e); }
}

export async function getMyPublishedGrades(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await gradesSheetService.getMyPublishedGrades(req.user!);
    res.json(result);
  } catch (e) { next(e); }
}
