-- La fecha limite de entrega de forums es una sola por curso de diplomado,
-- no una por cada dia/sesion. Se mueve de Sesion a Curso.
ALTER TABLE "Sesion" DROP COLUMN "fechaLimiteEntrega";
ALTER TABLE "Curso" ADD COLUMN "fechaLimiteEntrega" TIMESTAMP(3);
