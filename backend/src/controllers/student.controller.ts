import type { Request, Response, NextFunction } from "express";
import * as studentService from "../services/student.service.js";
import { z } from "zod";
import { ModoEstudio } from "@prisma/client";

const modoSchema = z.nativeEnum(ModoEstudio).optional();

const createStudentSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  codigo: z.string().max(30).optional(),
  modo: modoSchema,
  iglesia: z.string().max(120).optional(),
  pais: z.string().max(80).optional(),
  semestreIngreso: z.number().int().min(1).max(2).optional(),
  anioIngreso: z.number().int().min(2000).max(2100).optional(),
  dni: z.string().trim().min(1).max(20),
  telefono: z.string().max(20).optional(),
  fechaNacimiento: z.string().optional(),
  coordinador: z.string().max(120).optional(),
});

const updateStudentSchema = createStudentSchema.partial().extend({
  activo: z.boolean().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? "").trim();
    const students = await studentService.listStudents(q, req.user!);
    res.json({ students });
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createStudentSchema.parse(req.body);
    const student = await studentService.createStudent(input, req.user!);
    res.status(201).json(student);
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const input = updateStudentSchema.parse(req.body);
    const student = await studentService.updateStudent(id, input, req.user!);
    res.json(student);
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = z.string().min(1).parse(req.params.id);
    const student = await studentService.deactivateStudent(id, req.user!);
    res.json(student);
  } catch (e) { next(e); }
}

export async function importCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const rawRows = z.array(z.unknown()).parse(req.body.rows ?? req.body);
    const rows: studentService.CreateStudentInput[] = [];
    const validationErrors: string[] = [];

    rawRows.forEach((row, index) => {
      const parsed = createStudentSchema.safeParse(row);
      if (parsed.success) {
        rows.push(parsed.data);
        return;
      }

      validationErrors.push(`Fila ${index + 2}: datos invalidos`);
    });

    const result = await studentService.importStudents(rows, req.user!);
    result.skipped += validationErrors.length;
    result.errors.push(...validationErrors);
    res.json(result);
  } catch (e) { next(e); }
}
