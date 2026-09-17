import { PrismaClient, TipoCurso } from "@prisma/client";

const prisma = new PrismaClient();

// Diagnostico de solo lectura (no borra ni modifica nada): muestra, para un
// curso, TODAS las sesiones y TODAS las EntregaResumen (transcripciones)
// existentes, y si cada una apareceria o no en el panel "Revisar
// transcripciones" / pestana "Transcripcion" del ADMIN (que solo mira las
// primeras 3 sesiones del curso, ordenadas por `orden`, con `entregadoEn` no
// nulo — mismo criterio que usa la pestana de subida del alumno).
//
// Uso: npm run diagnose:summaries -- <cursoId o texto del nombre del curso>

function archivosCount(urlR2: string | null): number {
  if (!urlR2) return 0;
  try {
    const parsed: unknown = JSON.parse(urlR2);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 1;
  }
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error("Uso: npm run diagnose:summaries -- <cursoId o texto del nombre del curso>");
    process.exitCode = 1;
    return;
  }

  let cursos = await prisma.curso.findMany({
    where: { id: query },
    select: { id: true, nombre: true, ciclo: true, anio: true, tipo: true },
  });

  if (cursos.length === 0) {
    cursos = await prisma.curso.findMany({
      where: { nombre: { contains: query, mode: "insensitive" } },
      select: { id: true, nombre: true, ciclo: true, anio: true, tipo: true },
    });
  }

  if (cursos.length === 0) {
    console.error(`No se encontro ningun curso con id o nombre parecido a "${query}".`);
    process.exitCode = 1;
    return;
  }

  if (cursos.length > 1) {
    console.log(`Se encontraron ${cursos.length} cursos que matchean "${query}". Pasa el ID exacto de uno:`);
    console.table(cursos);
    return;
  }

  const curso = cursos[0];
  console.log(`Curso: ${curso.nombre} (ciclo ${curso.ciclo}/${curso.anio}, tipo ${curso.tipo}) — id ${curso.id}\n`);

  if (curso.tipo === TipoCurso.DIPLOMADO) {
    console.log("Este curso es DIPLOMADO: no maneja transcripciones/NT (usa Forum en su lugar). Nada que revisar aqui.");
    return;
  }

  const sesiones = await prisma.sesion.findMany({
    where: { cursoId: curso.id },
    orderBy: { orden: "asc" },
    select: { id: true, orden: true, titulo: true },
  });

  if (sesiones.length === 0) {
    console.log("Este curso no tiene sesiones creadas todavia.");
    return;
  }

  const primerasTres = new Set(sesiones.slice(0, 3).map((s) => s.id));

  console.log("Sesiones del curso (orden ascendente; las marcadas [*] son las que mira el panel):");
  console.table(
    sesiones.map((s) => ({
      "*": primerasTres.has(s.id) ? "*" : "",
      orden: s.orden,
      titulo: s.titulo,
      sesionId: s.id,
    })),
  );

  const entregas = await prisma.entregaResumen.findMany({
    where: { sesionId: { in: sesiones.map((s) => s.id) } },
    include: { estudiante: { select: { nombre: true, apellido: true, email: true } } },
    orderBy: [{ sesionId: "asc" }, { estudiante: { apellido: "asc" } }],
  });

  if (entregas.length === 0) {
    console.log("\nNo hay ninguna EntregaResumen (transcripcion) registrada para ninguna sesion de este curso.");
    return;
  }

  const ordenPorSesion = new Map(sesiones.map((s) => [s.id, s.orden]));

  console.log(`\n${entregas.length} EntregaResumen encontrada(s) en total (todas las sesiones, no solo las primeras 3):`);
  console.table(
    entregas.map((e) => {
      let motivo = "aparece en el panel";
      if (!primerasTres.has(e.sesionId)) {
        motivo = `NO aparece — sesion fuera de las primeras 3 (orden=${ordenPorSesion.get(e.sesionId)})`;
      } else if (!e.entregadoEn) {
        motivo = "NO aparece — entregadoEn vacio (solo quedo marcada 'requerido', el alumno no llego a subir archivo)";
      }
      return {
        alumno: `${e.estudiante.apellido}, ${e.estudiante.nombre}`,
        email: e.estudiante.email,
        dia: ordenPorSesion.get(e.sesionId) ?? "?",
        archivos: archivosCount(e.urlR2),
        entregadoEn: e.entregadoEn ? e.entregadoEn.toISOString() : "(vacio)",
        estado: e.estado,
        requerido: e.requerido,
        notaTranscripcion: e.notaTranscripcion ?? "(sin nota)",
        panel: motivo,
      };
    }),
  );

  console.log(
    "\nLos archivos en si viven en Cloudflare R2 bajo la key `resumenes/<sesionId>/<...>` " +
    "(campo EntregaResumen.urlR2); esta tabla no se movio ni se borro nada al crear el panel, " +
    "solo se agrego una vista de lectura sobre esta misma tabla.",
  );
}

main()
  .catch((error) => {
    console.error("Error al diagnosticar transcripciones:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
