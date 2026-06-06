import bcrypt from "bcrypt";
import { PrismaClient, Rol } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@instituto.test" },
    update: {},
    create: {
      email: "admin@instituto.test",
      passwordHash,
      nombre: "Admin",
      apellido: "General",
      rol: Rol.ADMIN,
    },
  });

  const profesorA = await prisma.usuario.upsert({
    where: { email: "profesor.matematica@instituto.test" },
    update: {},
    create: {
      email: "profesor.matematica@instituto.test",
      passwordHash,
      nombre: "Rosa",
      apellido: "Quispe",
      rol: Rol.PROFESOR,
    },
  });

  const profesorB = await prisma.usuario.upsert({
    where: { email: "profesor.comunicacion@instituto.test" },
    update: {},
    create: {
      email: "profesor.comunicacion@instituto.test",
      passwordHash,
      nombre: "Luis",
      apellido: "Mamani",
      rol: Rol.PROFESOR,
    },
  });

  const estudiantes = await Promise.all(
    Array.from({ length: 10 }, (_, index) => {
      const numero = index + 1;

      return prisma.usuario.upsert({
        where: { email: `estudiante${numero}@instituto.test` },
        update: {},
        create: {
          email: `estudiante${numero}@instituto.test`,
          passwordHash,
          nombre: `Estudiante ${numero}`,
          apellido: "Demo",
          rol: Rol.ESTUDIANTE,
        },
      });
    }),
  );

  const matematica = await prisma.curso.upsert({
    where: { id: "curso-matematica-basica-2026" },
    update: {},
    create: {
      id: "curso-matematica-basica-2026",
      nombre: "Matematica Basica",
      descripcion: "Curso de prueba para operaciones y razonamiento.",
      ciclo: 1,
      anio: 2026,
      profesorId: profesorA.id,
      config: { create: {} },
    },
  });

  const comunicacion = await prisma.curso.upsert({
    where: { id: "curso-comunicacion-2026" },
    update: {},
    create: {
      id: "curso-comunicacion-2026",
      nombre: "Comunicacion",
      descripcion: "Curso de prueba para lectura y redaccion.",
      ciclo: 1,
      anio: 2026,
      profesorId: profesorB.id,
      config: { create: {} },
    },
  });

  await Promise.all(
    estudiantes.flatMap((estudiante, index) => {
      const cursos = index < 5 ? [matematica] : [matematica, comunicacion];

      return cursos.map((curso) =>
        prisma.inscripcion.upsert({
          where: {
            estudianteId_cursoId: {
              estudianteId: estudiante.id,
              cursoId: curso.id,
            },
          },
          update: {},
          create: {
            estudianteId: estudiante.id,
            cursoId: curso.id,
          },
        }),
      );
    }),
  );

  await prisma.examen.upsert({
    where: { id: "examen-matematica-diagnostico" },
    update: {},
    create: {
      id: "examen-matematica-diagnostico",
      titulo: "Diagnostico de Matematica",
      descripcion: "Examen inicial de prueba.",
      cursoId: matematica.id,
      duracionMinutos: 30,
      publicadoEn: new Date(),
      preguntas: {
        create: [
          {
            texto: "Cuanto es 2 + 2?",
            opciones: ["3", "4", "5", "6"],
            respuestaCorrecta: "4",
            puntaje: 1,
            orden: 1,
          },
          {
            texto: "Cuanto es 5 x 3?",
            opciones: ["8", "12", "15", "20"],
            respuestaCorrecta: "15",
            puntaje: 1,
            orden: 2,
          },
        ],
      },
    },
  });

  console.log({
    admin: admin.email,
    profesores: [profesorA.email, profesorB.email],
    estudiantes: estudiantes.length,
    cursos: [matematica.nombre, comunicacion.nombre],
    passwordPrueba: "Password123!",
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
