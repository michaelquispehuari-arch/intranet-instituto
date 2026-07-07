import { Prisma, Rol } from "@prisma/client";
import type { AuthUser } from "../types/auth.js";
import { ForbiddenError, NotFoundError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";
import type { CreateCourseInput, EnrollStudentInput, UpdateCourseInput } from "../schemas/course.schema.js";

const courseSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  tipo: true,
  ciclo: true,
  anio: true,
  profesorId: true,
  activo: true,
  profesor: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
    },
  },
  _count: {
    select: {
      inscripciones: true,
      examenes: true,
      materiales: true,
    },
  },
};

export async function listCourses(user: AuthUser) {
  if (user.rol === Rol.ADMIN) {
    return prisma.curso.findMany({
      orderBy: [{ anio: "desc" }, { ciclo: "asc" }, { nombre: "asc" }],
      select: courseSelect,
    });
  }

  if (user.rol === Rol.PROFESOR) {
    return prisma.curso.findMany({
      where: {
        profesorId: user.id,
        activo: true,
      },
      orderBy: [{ anio: "desc" }, { ciclo: "asc" }, { nombre: "asc" }],
      select: courseSelect,
    });
  }

  return prisma.curso.findMany({
    where: {
      activo: true,
      inscripciones: {
        some: {
          estudianteId: user.id,
        },
      },
    },
    orderBy: [{ anio: "desc" }, { ciclo: "asc" }, { nombre: "asc" }],
    select: courseSelect,
  });
}

export async function getCourseById(courseId: string, user: AuthUser) {
  const course = await prisma.curso.findUnique({
    where: { id: courseId },
    select: {
      ...courseSelect,
      inscripciones: {
        select: {
          estudiante: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new NotFoundError("Curso no encontrado");
  }

  if (user.rol === Rol.ADMIN) {
    return course;
  }

  if (user.rol === Rol.PROFESOR && course.profesorId === user.id && course.activo) {
    return course;
  }

  const isEnrolled = course.inscripciones.some(
    (inscripcion) => inscripcion.estudiante.id === user.id,
  );

  if (user.rol === Rol.ESTUDIANTE && course.activo && isEnrolled) {
    return course;
  }

  throw new ForbiddenError();
}

export async function createCourse(input: CreateCourseInput) {
  await ensureActiveProfessor(input.profesorId);

  return prisma.$transaction(async (tx) => {
    const course = await tx.curso.create({
      data: {
        nombre: input.nombre,
        descripcion: input.descripcion,
        ciclo: input.ciclo,
        anio: input.anio,
        profesorId: input.profesorId,
        tipo: input.tipo,
        config: { create: {} },
      },
      select: courseSelect,
    });

    await enrollActiveStudentsInCourse(tx, course.id);
    return tx.curso.findUniqueOrThrow({
      where: { id: course.id },
      select: courseSelect,
    });
  });
}

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  await ensureCourseExists(courseId);

  if (input.profesorId) {
    await ensureActiveProfessor(input.profesorId);
  }

  return prisma.curso.update({
    where: { id: courseId },
    data: input,
    select: courseSelect,
  });
}

export async function deactivateCourse(courseId: string) {
  await ensureCourseExists(courseId);

  return prisma.curso.update({
    where: { id: courseId },
    data: { activo: false },
    select: courseSelect,
  });
}

export async function enrollStudent(courseId: string, input: EnrollStudentInput) {
  await ensureCourseExists(courseId);
  await ensureActiveStudent(input.estudianteId);

  return prisma.$transaction(async (tx) => {
    const student = await tx.usuario.findUniqueOrThrow({
      where: { id: input.estudianteId },
      select: { modo: true },
    });

    await tx.registroSemanal.upsert({
      where: {
        estudianteId_cursoId: {
          estudianteId: input.estudianteId,
          cursoId: courseId,
        },
      },
      update: {},
      create: {
        estudianteId: input.estudianteId,
        cursoId: courseId,
        modo: student.modo,
      },
    });

    return tx.inscripcion.upsert({
      where: {
        estudianteId_cursoId: {
          estudianteId: input.estudianteId,
          cursoId: courseId,
        },
      },
      update: {},
      create: {
        estudianteId: input.estudianteId,
        cursoId: courseId,
      },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        curso: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });
  });
}

export async function unenrollStudent(courseId: string, studentId: string) {
  await ensureCourseExists(courseId);

  const result = await prisma.inscripcion.deleteMany({
    where: {
      cursoId: courseId,
      estudianteId: studentId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundError("Inscripcion no encontrada");
  }

  await prisma.registroSemanal.deleteMany({
    where: {
      cursoId: courseId,
      estudianteId: studentId,
    },
  });

  return {
    cursoId: courseId,
    estudianteId: studentId,
  };
}

async function enrollActiveStudentsInCourse(tx: Prisma.TransactionClient, courseId: string) {
  const students = await tx.usuario.findMany({
    where: {
      rol: Rol.ESTUDIANTE,
      activo: true,
    },
    select: {
      id: true,
      modo: true,
    },
  });

  if (students.length === 0) {
    return;
  }

  await tx.inscripcion.createMany({
    data: students.map((student) => ({
      estudianteId: student.id,
      cursoId: courseId,
    })),
    skipDuplicates: true,
  });

  await tx.registroSemanal.createMany({
    data: students.map((student) => ({
      estudianteId: student.id,
      cursoId: courseId,
      modo: student.modo,
    })),
    skipDuplicates: true,
  });
}

async function ensureCourseExists(courseId: string) {
  const course = await prisma.curso.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Curso no encontrado");
  }
}

async function ensureActiveStudent(estudianteId: string) {
  const student = await prisma.usuario.findFirst({
    where: {
      id: estudianteId,
      rol: Rol.ESTUDIANTE,
      activo: true,
    },
    select: { id: true },
  });

  if (!student) {
    throw new NotFoundError("Estudiante no encontrado o inactivo");
  }
}

async function ensureActiveProfessor(profesorId: string) {
  const professor = await prisma.usuario.findFirst({
    where: {
      id: profesorId,
      rol: Rol.PROFESOR,
      activo: true,
    },
    select: { id: true },
  });

  if (!professor) {
    throw new NotFoundError("Profesor no encontrado o inactivo");
  }
}
