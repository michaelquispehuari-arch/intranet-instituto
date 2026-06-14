import { prisma } from "../utils/prisma.js";

const ZOOM_KEY = "enlace_zoom";

export async function getZoom() {
  const config = await prisma.configuracion.findUnique({
    where: { clave: ZOOM_KEY },
  });

  return { enlaceZoom: config?.valor ?? null };
}

export async function updateZoom(enlaceZoom: string) {
  return prisma.configuracion.upsert({
    where: { clave: ZOOM_KEY },
    update: { valor: enlaceZoom },
    create: { clave: ZOOM_KEY, valor: enlaceZoom },
  });
}
