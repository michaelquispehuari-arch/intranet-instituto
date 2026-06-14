import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../../src/app.js";
import { prisma } from "../../src/utils/prisma.js";

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const examId = "examen-matematica-diagnostico";

type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    rol: string;
  };
};

type ExamResponse = {
  exam: {
    id: string;
    tiempoRestanteSegundos: number;
    preguntas: Array<{
      id: string;
      respuestaCorrecta?: string;
    }>;
  };
};

let studentIdToClean: string | null = null;

after(async () => {
  if (studentIdToClean) {
    const submissions = await prisma.examenEnvio.findMany({
      where: { estudianteId: studentIdToClean, examenId: examId },
      select: { id: true },
    });

    await prisma.respuestaEstudiante.deleteMany({
      where: { envioId: { in: submissions.map((submission) => submission.id) } },
    });
    await prisma.examenEnvio.deleteMany({
      where: { id: { in: submissions.map((submission) => submission.id) } },
    });
  }

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

test("exam attempts start on open and expired attempts cannot be submitted", async () => {
  const student = await login("estudiante3@instituto.test");
  studentIdToClean = student.user.id;

  await prisma.respuestaEstudiante.deleteMany({
    where: {
      envio: {
        estudianteId: student.user.id,
        examenId: examId,
      },
    },
  });
  await prisma.examenEnvio.deleteMany({
    where: {
      estudianteId: student.user.id,
      examenId: examId,
    },
  });

  const examResponse = await request(`/api/exams/${examId}`, student.token);
  assert.equal(examResponse.status, 200);

  const examBody = (await examResponse.json()) as ExamResponse;
  assert.equal(examBody.exam.preguntas.some((question) => question.respuestaCorrecta), false);
  assert(examBody.exam.tiempoRestanteSegundos > 0);

  const attempt = await prisma.examenEnvio.findUnique({
    where: {
      estudianteId_examenId: {
        estudianteId: student.user.id,
        examenId: examId,
      },
    },
  });
  assert(attempt);
  assert.equal(attempt.completado, false);

  await prisma.examenEnvio.update({
    where: { id: attempt.id },
    data: {
      iniciadoEn: new Date(Date.now() - 31 * 60_000),
    },
  });

  const submitResponse = await request(`/api/exams/${examId}/submit`, student.token, {
    method: "POST",
    body: JSON.stringify({
      respuestas: examBody.exam.preguntas.map((question) => ({
        preguntaId: question.id,
        respuesta: "4",
      })),
    }),
  });

  assert.equal(submitResponse.status, 403);

  const expiredAttempt = await prisma.examenEnvio.findUniqueOrThrow({
    where: {
      estudianteId_examenId: {
        estudianteId: student.user.id,
        examenId: examId,
      },
    },
  });
  assert.equal(expiredAttempt.completado, false);
});
