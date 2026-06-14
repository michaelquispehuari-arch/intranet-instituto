import { TipoPregunta } from "@prisma/client";
import { z } from "zod";

export const examIdParamSchema = z.object({
  id: z.string().min(1),
});

const questionSchema = z
  .object({
    texto: z.string().trim().min(3).max(1000),
    tipo: z.nativeEnum(TipoPregunta).default(TipoPregunta.OPCION_MULTIPLE),
    opciones: z.array(z.string().trim().min(1).max(300)).min(0).max(6),
    respuestaCorrecta: z.string().trim().max(300).default(""),
    puntaje: z.number().positive().max(20).default(1),
  })
  .refine(
    (question) =>
      question.tipo === TipoPregunta.ABIERTA ||
      question.opciones.includes(question.respuestaCorrecta),
    {
      message: "La respuesta correcta debe existir dentro de opciones",
      path: ["respuestaCorrecta"],
    },
  );

export const createExamSchema = z
  .object({
    titulo: z.string().trim().min(3).max(150),
    descripcion: z.string().trim().max(500).optional(),
    cursoId: z.string().min(1),
    duracionMinutos: z.number().int().min(1).max(300),
    disponibleDesde: z.coerce.date().optional(),
    disponibleHasta: z.coerce.date().optional(),
    revelarRespuestas: z.boolean().default(true),
    esSustitutorio: z.boolean().default(false),
    preguntas: z.array(questionSchema).min(1).max(100),
  })
  .refine(
    (exam) =>
      !exam.disponibleDesde ||
      !exam.disponibleHasta ||
      exam.disponibleHasta > exam.disponibleDesde,
    {
      message: "disponibleHasta debe ser posterior a disponibleDesde",
      path: ["disponibleHasta"],
    },
  );

export const submitExamSchema = z.object({
  respuestas: z
    .array(
      z.object({
        preguntaId: z.string().min(1),
        respuesta: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1),
});

export const gradeOpenSchema = z.object({
  calificaciones: z
    .array(
      z.object({
        respuestaId: z.string().min(1),
        puntajeManual: z.number().min(0).max(20),
      }),
    )
    .min(1),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
export type GradeOpenInput = z.infer<typeof gradeOpenSchema>;
