import { PrismaClient } from "@prisma/client";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const applyFlag = "--apply";

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

// Junta las keys de R2 que dependen de estos cursos (material subido, transcripciones
// de sus sesiones, archivos de Forum) ANTES de borrar filas, porque una vez borradas
// se pierde la referencia a esas keys.
async function collectR2Keys(cursoIds: string[]): Promise<string[]> {
  const [materiales, resumenes, forums] = await Promise.all([
    prisma.material.findMany({ where: { cursoId: { in: cursoIds } }, select: { urlR2: true } }),
    prisma.entregaResumen.findMany({ where: { sesion: { cursoId: { in: cursoIds } } }, select: { urlR2: true } }),
    prisma.entregaForum.findMany({ where: { cursoId: { in: cursoIds } }, select: { archivos: true } }),
  ]);

  const keys: string[] = [];
  for (const m of materiales) keys.push(m.urlR2);

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
  const args = process.argv.slice(2).filter((a) => a !== applyFlag);
  const apply = process.argv.includes(applyFlag);

  if (args.length === 0) {
    console.error("Uso: npm run delete:course -- <cursoId> [cursoId2 ...] [--apply]");
    console.error("Sin --apply solo se muestra un DRY RUN (nada se borra).");
    process.exitCode = 1;
    return;
  }

  const cursos = await prisma.curso.findMany({
    where: { id: { in: args } },
    select: { id: true, nombre: true, ciclo: true, anio: true },
  });

  const encontrados = new Set(cursos.map((c) => c.id));
  const noEncontrados = args.filter((id) => !encontrados.has(id));
  if (noEncontrados.length > 0) {
    console.error(`No se encontraron estos IDs de curso: ${noEncontrados.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(apply ? "Cursos a ELIMINAR PERMANENTEMENTE:" : "DRY RUN — cursos que se eliminarian:");
  console.table(cursos);

  const ids = cursos.map((c) => c.id);

  const counts = {
    respuestas: await prisma.respuestaEstudiante.count({ where: { envio: { examen: { cursoId: { in: ids } } } } }),
    envios: await prisma.examenEnvio.count({ where: { examen: { cursoId: { in: ids } } } }),
    preguntas: await prisma.pregunta.count({ where: { examen: { cursoId: { in: ids } } } }),
    examenes: await prisma.examen.count({ where: { cursoId: { in: ids } } }),
    asistencias: await prisma.asistencia.count({ where: { sesion: { cursoId: { in: ids } } } }),
    resumenes: await prisma.entregaResumen.count({ where: { sesion: { cursoId: { in: ids } } } }),
    materiales: await prisma.material.count({ where: { cursoId: { in: ids } } }),
    sesiones: await prisma.sesion.count({ where: { cursoId: { in: ids } } }),
    entregasForum: await prisma.entregaForum.count({ where: { cursoId: { in: ids } } }),
    notasManuales: await prisma.notaManual.count({ where: { cursoId: { in: ids } } }),
    habilitaciones: await prisma.habilitacionSustitutorio.count({ where: { cursoId: { in: ids } } }),
    registrosSemanal: await prisma.registroSemanal.count({ where: { cursoId: { in: ids } } }),
    inscripciones: await prisma.inscripcion.count({ where: { cursoId: { in: ids } } }),
  };

  console.log("\nRegistros dependientes que se eliminarian en cascada:");
  console.table(counts);

  if (!apply) {
    console.log(`\nNada se borro todavia. Vuelve a correr agregando ${applyFlag} para ejecutar el borrado real.`);
    return;
  }

  const r2Keys = await collectR2Keys(ids);

  const result = await prisma.$transaction(
    async (tx) => {
      const respuestas = await tx.respuestaEstudiante.deleteMany({ where: { envio: { examen: { cursoId: { in: ids } } } } });
      const envios = await tx.examenEnvio.deleteMany({ where: { examen: { cursoId: { in: ids } } } });
      const preguntas = await tx.pregunta.deleteMany({ where: { examen: { cursoId: { in: ids } } } });
      const examenes = await tx.examen.deleteMany({ where: { cursoId: { in: ids } } });
      const asistencias = await tx.asistencia.deleteMany({ where: { sesion: { cursoId: { in: ids } } } });
      const resumenes = await tx.entregaResumen.deleteMany({ where: { sesion: { cursoId: { in: ids } } } });
      const materiales = await tx.material.deleteMany({ where: { cursoId: { in: ids } } });
      const sesiones = await tx.sesion.deleteMany({ where: { cursoId: { in: ids } } });
      const entregasForum = await tx.entregaForum.deleteMany({ where: { cursoId: { in: ids } } });
      const notasManuales = await tx.notaManual.deleteMany({ where: { cursoId: { in: ids } } });
      const habilitaciones = await tx.habilitacionSustitutorio.deleteMany({ where: { cursoId: { in: ids } } });
      const registrosSemanal = await tx.registroSemanal.deleteMany({ where: { cursoId: { in: ids } } });
      const inscripciones = await tx.inscripcion.deleteMany({ where: { cursoId: { in: ids } } });
      await tx.configCurso.deleteMany({ where: { cursoId: { in: ids } } });
      const cursosEliminados = await tx.curso.deleteMany({ where: { id: { in: ids } } });

      return {
        respuestas: respuestas.count,
        envios: envios.count,
        preguntas: preguntas.count,
        examenes: examenes.count,
        asistencias: asistencias.count,
        resumenes: resumenes.count,
        materiales: materiales.count,
        sesiones: sesiones.count,
        entregasForum: entregasForum.count,
        notasManuales: notasManuales.count,
        habilitaciones: habilitaciones.count,
        registrosSemanal: registrosSemanal.count,
        inscripciones: inscripciones.count,
        cursos: cursosEliminados.count,
      };
    },
    { timeout: 60000 },
  );

  console.log("\nLimpiando archivos en R2 de esos cursos...");
  const r2Deleted = await deleteR2Keys(r2Keys);
  console.log(`R2: ${r2Deleted} objeto(s) eliminado(s).`);

  console.log("\nBorrado completado:");
  console.table(result);
}

main()
  .catch((error) => {
    console.error("Error al borrar curso(s):", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
