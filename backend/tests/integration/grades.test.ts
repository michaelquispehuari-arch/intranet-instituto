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
  await prisma.asistencia.deleteMany({
    where: {
      cursoId: courseId,
      fecha: new Date(2026, 5, 5),
    },
  });
  await prisma.configCurso.update({
    where: { cursoId: courseId },
    data: {
      pesoExamenes: 0.7,
      pesoNotasManuales: 0.3,
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

  const invalidConfigResponse = await request(`/api/grades/config/${courseId}`, admin.token, {
    method: "PATCH",
    body: JSON.stringify({ pesoExamenes: 0.9, pesoNotasManuales: 0.9 }),
  });
  assert.equal(invalidConfigResponse.status, 400);

  const validConfigResponse = await request(`/api/grades/config/${courseId}`, admin.token, {
    method: "PATCH",
    body: JSON.stringify({
      pesoExamenes: 0.7,
      pesoNotasManuales: 0.3,
      notaAprobatoria: 11,
    }),
  });
  assert.equal(validConfigResponse.status, 200);

  const forbiddenManualGradeResponse = await request("/api/grades/manual", professor.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: otherCourseId,
      valor: 15,
    }),
  });
  assert.equal(forbiddenManualGradeResponse.status, 403);

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

  const updateManualGradeResponse = await request(
    `/api/grades/manual/${manualGradeBody.grade.id}`,
    professor.token,
    {
      method: "PATCH",
      body: JSON.stringify({ valor: 18 }),
    },
  );
  assert.equal(updateManualGradeResponse.status, 200);

  const professorSummaryResponse = await request(
    `/api/grades?cursoId=${courseId}&estudianteId=${student.user.id}`,
    professor.token,
  );
  assert.equal(professorSummaryResponse.status, 200);

  const professorSummaryBody = (await professorSummaryResponse.json()) as {
    summaries: Array<{ estudiante: { id: string }; promedioNotasManuales: number }>;
  };
  assert.equal(professorSummaryBody.summaries.length, 1);
  assert.equal(professorSummaryBody.summaries[0]?.estudiante.id, student.user.id);
  assert.equal(professorSummaryBody.summaries[0]?.promedioNotasManuales, 18);

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

  const studentConfigResponse = await request(`/api/grades/config/${courseId}`, student.token);
  assert.equal(studentConfigResponse.status, 403);

  const attendanceResponse = await request("/api/grades/attendance", professor.token, {
    method: "POST",
    body: JSON.stringify({
      estudianteId: student.user.id,
      cursoId: courseId,
      fecha: "2026-06-05",
      estado: "PRESENTE",
    }),
  });
  assert.equal(attendanceResponse.status, 200);

  const studentAttendanceResponse = await request(
    `/api/grades/attendance?cursoId=${courseId}&estudianteId=${otherStudent.user.id}`,
    student.token,
  );
  assert.equal(studentAttendanceResponse.status, 200);

  const studentAttendanceBody = (await studentAttendanceResponse.json()) as {
    attendance: Array<{ estudiante: { id: string } }>;
  };
  assert(
    studentAttendanceBody.attendance.every((attendance) => attendance.estudiante.id === student.user.id),
  );
});
