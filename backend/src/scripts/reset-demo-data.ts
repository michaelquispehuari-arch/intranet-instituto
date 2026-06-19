import { PrismaClient, Rol } from "@prisma/client";

const prisma = new PrismaClient();
const confirmationFlag = "--confirm-reset-demo";

async function main() {
  if (!process.argv.includes(confirmationFlag)) {
    console.error(`Reset cancelado. Ejecuta con ${confirmationFlag} para confirmar.`);
    process.exitCode = 1;
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const respuestas = await tx.respuestaEstudiante.deleteMany();
    const envios = await tx.examenEnvio.deleteMany();
    const preguntas = await tx.pregunta.deleteMany();
    const examenes = await tx.examen.deleteMany();
    const notas = await tx.notaManual.deleteMany();
    const asistencias = await tx.asistencia.deleteMany();
    const resumenes = await tx.entregaResumen.deleteMany();
    const materiales = await tx.material.deleteMany();
    const registros = await tx.registroSemanal.deleteMany();
    const habilitaciones = await tx.habilitacionSustitutorio.deleteMany();
    const inscripciones = await tx.inscripcion.deleteMany();
    const sesiones = await tx.sesion.deleteMany();
    const configCursos = await tx.configCurso.deleteMany();
    const cursos = await tx.curso.deleteMany();
    const usuarios = await tx.usuario.deleteMany({
      where: {
        rol: { in: [Rol.PROFESOR, Rol.ESTUDIANTE] },
      },
    });

    return {
      respuestas: respuestas.count,
      envios: envios.count,
      preguntas: preguntas.count,
      examenes: examenes.count,
      notas: notas.count,
      asistencias: asistencias.count,
      resumenes: resumenes.count,
      materiales: materiales.count,
      registros: registros.count,
      habilitaciones: habilitaciones.count,
      inscripciones: inscripciones.count,
      sesiones: sesiones.count,
      configCursos: configCursos.count,
      cursos: cursos.count,
      usuarios: usuarios.count,
    };
  });

  console.log("Reset demo completado. Se conservaron usuarios ADMIN y configuracion global.");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("Error al resetear datos demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
