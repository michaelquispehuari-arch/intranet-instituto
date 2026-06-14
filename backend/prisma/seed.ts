import bcrypt from "bcrypt";
import { PrismaClient, Rol, TipoCurso } from "@prisma/client";

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
      tipo: TipoCurso.REGULAR,
      profesorId: profesorA.id,
      config: {
        create: {
          pesoAsistencia: 0.5,
          pesoAcademico: 0.5,
          notaAprobatoria: 11,
        },
      },
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
      tipo: TipoCurso.REGULAR,
      profesorId: profesorB.id,
      config: {
        create: {
          pesoAsistencia: 0.5,
          pesoAcademico: 0.5,
          notaAprobatoria: 11,
        },
      },
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

  const lunes = new Date("2026-06-15");
  const martes = new Date("2026-06-16");
  const miercoles = new Date("2026-06-17");

  const sesion1 = await prisma.sesion.upsert({
    where: { id: "sesion-mat-lunes" },
    update: {},
    create: {
      id: "sesion-mat-lunes",
      cursoId: matematica.id,
      fecha: lunes,
      titulo: "Clase Lunes - Numeros Naturales",
      orden: 1,
    },
  });

  const sesion2 = await prisma.sesion.upsert({
    where: { id: "sesion-mat-martes" },
    update: {},
    create: {
      id: "sesion-mat-martes",
      cursoId: matematica.id,
      fecha: martes,
      titulo: "Clase Martes - Fracciones",
      orden: 2,
    },
  });

  await prisma.sesion.upsert({
    where: { id: "sesion-mat-miercoles" },
    update: {},
    create: {
      id: "sesion-mat-miercoles",
      cursoId: matematica.id,
      fecha: miercoles,
      titulo: "Clase Miercoles - Decimales",
      orden: 3,
    },
  });

  await prisma.sesion.upsert({
    where: { id: "sesion-com-lunes" },
    update: {},
    create: {
      id: "sesion-com-lunes",
      cursoId: comunicacion.id,
      fecha: lunes,
      titulo: "Clase Lunes - Lectura Comprensiva",
      orden: 1,
    },
  });

  await prisma.sesion.upsert({
    where: { id: "sesion-com-martes" },
    update: {},
    create: {
      id: "sesion-com-martes",
      cursoId: comunicacion.id,
      fecha: martes,
      titulo: "Clase Martes - Redaccion",
      orden: 2,
    },
  });

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
      revelarRespuestas: true,
      esSustitutorio: false,
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

  await prisma.configuracion.upsert({
    where: { clave: "enlace_zoom" },
    update: {},
    create: {
      clave: "enlace_zoom",
      valor: "https://zoom.us/j/ejemplo",
    },
  });

  await prisma.asistencia.upsert({
    where: {
      estudianteId_sesionId: {
        estudianteId: estudiantes[0].id,
        sesionId: sesion1.id,
      },
    },
    update: {},
    create: {
      estudianteId: estudiantes[0].id,
      sesionId: sesion1.id,
      estado: "PRESENTE",
    },
  });

  await prisma.asistencia.upsert({
    where: {
      estudianteId_sesionId: {
        estudianteId: estudiantes[1].id,
        sesionId: sesion1.id,
      },
    },
    update: {},
    create: {
      estudianteId: estudiantes[1].id,
      sesionId: sesion1.id,
      estado: "AUSENTE",
    },
  });

  await prisma.entregaResumen.upsert({
    where: {
      sesionId_estudianteId: {
        sesionId: sesion1.id,
        estudianteId: estudiantes[1].id,
      },
    },
    update: {},
    create: {
      sesionId: sesion1.id,
      estudianteId: estudiantes[1].id,
      requerido: true,
      fechaLimite: new Date("2026-06-20"),
    },
  });

  await prisma.entregaResumen.upsert({
    where: {
      sesionId_estudianteId: {
        sesionId: sesion2.id,
        estudianteId: estudiantes[2].id,
      },
    },
    update: {},
    create: {
      sesionId: sesion2.id,
      estudianteId: estudiantes[2].id,
      requerido: true,
      fechaLimite: new Date("2026-06-21"),
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
