import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../../src/app.js";
import { prisma } from "../../src/utils/prisma.js";

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const courseId = "curso-matematica-basica-2026";
const otherCourseId = "curso-comunicacion-2026";

type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    rol: string;
  };
};

const createdManualGradeIds: string[] = [];

after(async () => {
  await prisma.notaManual.deleteMany({
    where: { id: { in: createdManualGradeIds } },
  });
  // Revertir nota de asistencia en inscripción (campo nuevo en lugar del registro por fecha)
  await prisma.inscripcion.updateMany({
    where: { cursoId: courseId },
    data: { notaAsistencia: null },
  });
  // Revertir config del curso a valores por defecto
  await prisma.configCurso.update({
    where: { cursoId: courseId },
    data: {
      pesoAsistencia: 0.5,
      pesoAcademico: 0.5,
      notaAprobatoria: 11,
    },
  });
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await prisma.$disconnect();
});

async function login(email: string): Promise<AuthSession> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Password123!" }),
  });

  assert.equal(response.status, 200);
  return response.json() as Promise<AuthSession>;
}

async function request(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Connection: "close",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
}

test("grades module enforces roles, ownership and configurable weights", async () => {
  const admin = await login("admin@instituto.test");
  const professor = await login("profesor.matematica@instituto.test");
  const student = await login("estudiante1@instituto.test");
  const otherStudent = await login("estudiante2@instituto.test");

  const configResponse = await request(`/api/grades/config/${courseId}`, admin.token);
  assert.equal(configResponse.status, 200);

  // Pesos que suman > 1 → 400
  const invalidConfigResponse = await request(`/api/grades/config/${courseId}`, admin.token, {
    method: "PATCH",
    body: JSON.stringify({ pesoAsistencia: 0.9, pesoAcademico: 0.9 }),
  });
  assert.equal(invalidConfigResponse.status, 400);

  // Pesos válidos (50/50)
  const validConfigResponse = await request(`/api/grades/config/${courseId}`, admin.token, {
    method: "PATCH",
    body: JSON.stringify({
      pesoAsistencia: 0.5,
      pesoAcademico: 0.5,
      notaAprobatoria: 11,
    }),
  });
  assert.equal(validConfigResponse.status, 200);

  // Nota manual en curso ajeno → 403
  const forbiddenManualGradeResponse = await request("/api/grades/manual", professor.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: otherCourseId,
      valor: 15,
    }),
  });
  assert.equal(forbiddenManualGradeResponse.status, 403);

  // Nota manual válida
  const manualGradeResponse = await request("/api/grades/manual", professor.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: courseId,
      valor: 16,
      descripcion: "Prueba automatizada",
    }),
  });
  assert.equal(manualGradeResponse.status, 201);

  const manualGradeBody = (await manualGradeResponse.json()) as { grade: { id: string } };
  createdManualGradeIds.push(manualGradeBody.grade.id);

  // Actualizar nota manual
  const updateManualGradeResponse = await request(
    `/api/grades/manual/${manualGradeBody.grade.id}`,
    professor.token,
    {
      method: "PATCH",
      body: JSON.stringify({ valor: 18 }),
    },
  );
  assert.equal(updateManualGradeResponse.status, 200);

  // Resumen de notas (devuelve promedioAcademico en nuevo schema)
  const professorSummaryResponse = await request(
    `/api/grades?cursoId=${courseId}&estudianteId=${student.user.id}`,
    professor.token,
  );
  assert.equal(professorSummaryResponse.status, 200);

  const professorSummaryBody = (await professorSummaryResponse.json()) as {
    summaries: Array<{
      estudiante: { id: string };
      notaAsistencia: number | null;
      promedioAcademico: number;
      promedioFinal: number | null;
    }>;
  };
  assert.equal(professorSummaryBody.summaries.length, 1);
  assert.equal(professorSummaryBody.summaries[0]?.estudiante.id, student.user.id);
  assert.equal(professorSummaryBody.summaries[0]?.notaAsistencia, null);
  assert.equal(professorSummaryBody.summaries[0]?.promedioAcademico, 18);
  assert.equal(professorSummaryBody.summaries[0]?.promedioFinal, null);

  // Estudiante no puede ver datos de otro estudiante
  const studentLeakResponse = await request(
    `/api/grades?cursoId=${courseId}&estudianteId=${otherStudent.user.id}`,
    student.token,
  );
  assert.equal(studentLeakResponse.status, 200);

  const studentLeakBody = (await studentLeakResponse.json()) as {
    summaries: Array<{ estudiante: { id: string } }>;
  };
  assert.deepEqual(
    studentLeakBody.summaries.map((summary) => summary.estudiante.id),
    [student.user.id],
  );

  // Config inaccesible para estudiante
  const studentConfigResponse = await request(`/api/grades/config/${courseId}`, student.token);
  assert.equal(studentConfigResponse.status, 403);

  // Nota de asistencia (0-20 en inscripcion, solo ADMIN)
  const attendanceByProfessorResponse = await request("/api/grades/attendance", professor.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: courseId,
      notaAsistencia: 16,
    }),
  });
  assert.equal(attendanceByProfessorResponse.status, 403);

  const attendanceResponse = await request("/api/grades/attendance", admin.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: courseId,
      notaAsistencia: 16,
    }),
  });
  assert.equal(attendanceResponse.status, 200);

  const completedSummaryResponse = await request(
    `/api/grades?cursoId=${courseId}&estudianteId=${student.user.id}`,
    professor.token,
  );
  assert.equal(completedSummaryResponse.status, 200);
  const completedSummaryBody = (await completedSummaryResponse.json()) as {
    summaries: Array<{ promedioFinal: number; aprobado: boolean }>;
  };
  assert.equal(completedSummaryBody.summaries[0]?.promedioFinal, 17);
  assert.equal(completedSummaryBody.summaries[0]?.aprobado, true);

  // Estudiante no puede ver notas de otro estudiante en attendance
  const studentAttendanceResponse = await request(
    `/api/grades/attendance?cursoId=${courseId}&estudianteId=${otherStudent.user.id}`,
    student.token,
  );
  assert.equal(studentAttendanceResponse.status, 200);

  const studentAttendanceBody = (await studentAttendanceResponse.json()) as {
    attendance: Array<{ estudiante: { id: string } }>;
  };
  assert(
    studentAttendanceBody.attendance.every((a) => a.estudiante.id === student.user.id),
  );

  // Timeline accesible para todos los roles
  const timelineResponse = await request("/api/grades/timeline", student.token);
  assert.equal(timelineResponse.status, 200);
  const timelineBody = (await timelineResponse.json()) as Array<{
    estudiante: { id: string };
    semanas: Array<{ estado: string }>;
  }>;
  assert(Array.isArray(timelineBody));
  // Estudiante solo ve sus propios datos
  assert(timelineBody.every((e) => e.estudiante.id === student.user.id));
});
