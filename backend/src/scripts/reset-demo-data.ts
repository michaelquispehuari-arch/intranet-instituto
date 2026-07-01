import { PrismaClient, Rol } from "@prisma/client";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const confirmationFlag = "--confirm-reset-demo";

async function deleteAllR2Objects(): Promise<number> {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.log("R2 no configurado — saltando limpieza de archivos en la nube.");
    return 0;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listResp = await client.send(
      new ListObjectsV2Command({ Bucket: bucketName, ContinuationToken: continuationToken }),
    );

    const objects = listResp.Contents ?? [];

    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
        }),
      );
      totalDeleted += objects.length;
    }

    continuationToken = listResp.NextContinuationToken;
  } while (continuationToken);

  return totalDeleted;
}

async function main() {
  if (!process.argv.includes(confirmationFlag)) {
    console.error(`Reset cancelado. Ejecuta con ${confirmationFlag} para confirmar.`);
    process.exitCode = 1;
    return;
  }

  console.log("Limpiando archivos en R2...");
  const r2Deleted = await deleteAllR2Objects();
  console.log(`R2: ${r2Deleted} objeto(s) eliminado(s).`);

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
      where: { rol: { in: [Rol.PROFESOR, Rol.ESTUDIANTE] } },
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

  console.log("\nReset completado. Se conservaron usuarios ADMIN y configuracion global.");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("Error al resetear datos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
