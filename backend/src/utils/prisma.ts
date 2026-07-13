import { PrismaClient } from "@prisma/client";

// Sin esto, Prisma usa un pool por defecto muy chico (num_cpus*2+1, a veces
// 3-5 conexiones), suficiente para trafico normal pero no para picos como
// 100 alumnos entregando un examen casi al mismo tiempo.
function buildDatabaseUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return base;
  const url = new URL(base);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "20");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
  return url.toString();
}

export const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } },
});
