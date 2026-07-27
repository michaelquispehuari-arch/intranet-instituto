import { PrismaClient, Rol } from "@prisma/client";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const confirmationFlag = "--confirm-delete-students";

type ArchivoForum = { key: string; nombreOriginal: string };

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return null;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, bucketName };
}

async function deleteR2Keys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const r2 = getR2Client();
  if (!r2) {
    console.log("R2 no configurado — saltando limpieza de archivos en la nube.");
    return 0;
  }

  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await r2.client.send(
      new DeleteObjectsCommand({
        Bucket: r2.bucketName,
        Delete: { Objects: batch.map((k) => ({ Key: k })) },
      }),
    );
    deleted += batch.length;
  }

  return deleted;
}

// Junta las keys de R2 que dependen de estos estudiantes (transcripciones
// subidas + archivos de Forum) ANTES de borrar las filas de la base, porque
// una vez borrada la fila se pierde la referencia a esas keys.
async function collectR2Keys(estudianteIds: string[]): Promise<string[]> {
  const [resumenes, forums] = await Promise.all([
    prisma.entregaResumen.findMany({
      where: { estudianteId: { in: estudianteIds } },
      select: { urlR2: true },
    }),
    prisma.entregaForum.findMany({
      where: { estudianteId: { in: estudianteIds } },
      select: { archivos: true },
    }),
  ]);

  const keys: string[] = [];

  for (const r of resumenes) {
    if (!r.urlR2) continue;
    try {
      const parsed: unknown = JSON.parse(r.urlR2);
      if (Array.isArray(parsed)) keys.push(...(parsed as string[]));
      else keys.push(r.urlR2);
    } catch {
      keys.push(r.urlR2);
    }
  }

  for (const f of forums) {
    const archivos = Array.isArray(f.archivos) ? (f.archivos as unknown as ArchivoForum[]) : [];
    keys.push(...archivos.map((a) => a.key));
  }

  return keys;
}

async function main() {
  if (!process.argv.includes(confirmationFlag)) {
    console.error(`Cancelado. Ejecuta con ${confirmationFlag} para confirmar.`);
    process.exitCode = 1;
    return;
  }

  const estudiantes = await prisma.usuario.findMany({
    where: { rol: Rol.ESTUDIANTE },
    select: { id: true },
  });
  const ids = estudiantes.map((e) => e.id);

  if (ids.length === 0) {
    console.log("No hay usuarios con rol ESTUDIANTE — nada que borrar.");
    return;
  }

  const r2Keys = await collectR2Keys(ids);

  // Solo se borra lo que depende de estos estudiantes. Cursos, sesiones,
  // examenes, preguntas, materiales y usuarios ADMIN/PROFESOR quedan intactos.
  const result = await prisma.$transaction(
    async (tx) => {
      const respuestas = await tx.respuestaEstudiante.deleteMany({
        where: { envio: { estudianteId: { in: ids } } },
      });
      const envios = await tx.examenEnvio.deleteMany({ where: { estudianteId: { in: ids } } });
      const notas = await tx.notaManual.deleteMany({ where: { estudianteId: { in: ids } } });
      const asistencias = await tx.asistencia.deleteMany({ where: { estudianteId: { in: ids } } });
      const resumenes = await tx.entregaResumen.deleteMany({ where: { estudianteId: { in: ids } } });
      const entregasForum = await tx.entregaForum.deleteMany({ where: { estudianteId: { in: ids } } });
      const registros = await tx.registroSemanal.deleteMany({ where: { estudianteId: { in: ids } } });
      const habilitaciones = await tx.habilitacionSustitutorio.deleteMany({
        where: { estudianteId: { in: ids } },
      });
      const inscripciones = await tx.inscripcion.deleteMany({ where: { estudianteId: { in: ids } } });
      const usuarios = await tx.usuario.deleteMany({ where: { rol: Rol.ESTUDIANTE } });

      return {
        respuestas: respuestas.count,
        envios: envios.count,
        notas: notas.count,
        asistencias: asistencias.count,
        resumenes: resumenes.count,
        entregasForum: entregasForum.count,
        registros: registros.count,
        habilitaciones: habilitaciones.count,
        inscripciones: inscripciones.count,
        usuarios: usuarios.count,
      };
    },
    { timeout: 60000 },
  );

  console.log("Limpiando archivos en R2 de esos estudiantes...");
  const r2Deleted = await deleteR2Keys(r2Keys);
  console.log(`R2: ${r2Deleted} objeto(s) eliminado(s).`);

  console.log("\nBorrado completado. Se conservaron ADMIN, PROFESOR, cursos, sesiones, examenes y materiales.");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("Error al borrar estudiantes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
