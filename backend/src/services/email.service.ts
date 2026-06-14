import { enqueueEmail } from "../queues/email.queue.js";
import { env } from "../config/env.js";

async function tryEnqueue(args: Parameters<typeof enqueueEmail>[0]) {
  try {
    await enqueueEmail(args);
  } catch {
    // Fire-and-forget: si Redis no está configurado, no falla la operación principal.
  }
}

export async function sendWelcomeEmail(to: string, nombre: string, password: string) {
  const base = env.FRONTEND_URL;
  await tryEnqueue({
    to,
    subject: "Bienvenido a la Intranet del Instituto",
    text: `Hola ${nombre},\n\nTu cuenta ha sido creada.\n\nEmail: ${to}\nContraseña temporal: ${password}\n\nInicia sesión en: ${base}/login\n\nCambia tu contraseña después de ingresar.`,
    html: `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Tu cuenta en la Intranet del Instituto ha sido creada.</p>
      <ul><li><strong>Email:</strong> ${to}</li><li><strong>Contraseña temporal:</strong> ${password}</li></ul>
      <p><a href="${base}/login">Iniciar sesión →</a></p>
      <p style="color:#8A8E89;font-size:13px">Cambia tu contraseña después de ingresar.</p>
    `,
  });
}

export async function sendExamPublishedEmail(
  students: Array<{ email: string; nombre: string }>,
  examTitulo: string,
  cursoNombre: string,
) {
  const base = env.FRONTEND_URL;
  for (const s of students) {
    await tryEnqueue({
      to: s.email,
      subject: `Nuevo examen disponible: ${examTitulo}`,
      text: `Hola ${s.nombre},\n\nSe ha publicado el examen "${examTitulo}" en el curso "${cursoNombre}".\n\nEntra a la intranet para rendirlo: ${base}/exams`,
      html: `
        <p>Hola <strong>${s.nombre}</strong>,</p>
        <p>Se ha publicado el examen <strong>${examTitulo}</strong> en el curso <strong>${cursoNombre}</strong>.</p>
        <p><a href="${base}/exams">Ver examen →</a></p>
      `,
    });
  }
}

export async function sendGradesAvailableEmail(
  to: string,
  nombre: string,
  cursoNombre: string,
  notaFinal: number,
  notaAprobatoria: number,
) {
  const base = env.FRONTEND_URL;
  const aprobado = notaFinal >= notaAprobatoria;
  const color = aprobado ? "#2C6A48" : "#B5482F";
  await tryEnqueue({
    to,
    subject: `Tus notas de ${cursoNombre} están disponibles`,
    text: `Hola ${nombre},\n\nTus notas del curso "${cursoNombre}" han sido registradas.\nNota final: ${notaFinal.toFixed(2)} — ${aprobado ? "Aprobado" : "Desaprobado"}\n\nVer detalles: ${base}/calificaciones`,
    html: `
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Tus notas del curso <strong>${cursoNombre}</strong> han sido registradas.</p>
      <p>Nota final: <strong>${notaFinal.toFixed(2)}</strong> — <strong style="color:${color}">${aprobado ? "Aprobado" : "Desaprobado"}</strong></p>
      <p><a href="${base}/calificaciones">Ver calificaciones →</a></p>
    `,
  });
}
