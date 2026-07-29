import { PrismaClient } from "@prisma/client";
import { toTitleCase } from "../utils/text.js";

const prisma = new PrismaClient();
const applyFlag = "--apply";

const CAMPOS = ["nombre", "apellido", "iglesia", "pais", "coordinador"] as const;
type Campo = (typeof CAMPOS)[number];

async function main() {
  const apply = process.argv.includes(applyFlag);

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, rol: true, nombre: true, apellido: true, iglesia: true, pais: true, coordinador: true },
  });

  const cambios: { id: string; rol: string; campo: Campo; antes: string; despues: string }[] = [];

  for (const u of usuarios) {
    for (const campo of CAMPOS) {
      const actual = u[campo];
      if (!actual) continue;
      const corregido = toTitleCase(actual);
      if (corregido !== actual) {
        cambios.push({ id: u.id, rol: u.rol, campo, antes: actual, despues: corregido });
      }
    }
  }

  if (cambios.length === 0) {
    console.log("Nada que corregir: todos los nombres ya estan en Title Case.");
    return;
  }

  console.log(`${cambios.length} campo(s) a corregir en ${new Set(cambios.map((c) => c.id)).size} usuario(s):\n`);
  console.table(cambios.map((c) => ({ rol: c.rol, campo: c.campo, antes: c.antes, despues: c.despues })));

  if (!apply) {
    console.log(`\nDRY RUN -- no se escribio nada. Ejecuta con ${applyFlag} para aplicar estos cambios.`);
    return;
  }

  const porUsuario = new Map<string, Partial<Record<Campo, string>>>();
  for (const c of cambios) {
    if (!porUsuario.has(c.id)) porUsuario.set(c.id, {});
    porUsuario.get(c.id)![c.campo] = c.despues;
  }

  let actualizados = 0;
  for (const [id, data] of porUsuario) {
    await prisma.usuario.update({ where: { id }, data });
    actualizados++;
  }

  console.log(`\nAplicado: ${actualizados} usuario(s) actualizados.`);
}

main()
  .catch((error) => {
    console.error("Error en backfill de Title Case:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
