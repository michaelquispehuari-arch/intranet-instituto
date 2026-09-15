-- CreateTable
CREATE TABLE "Bloque" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),

    CONSTRAINT "Bloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromedioBloque" (
    "id" TEXT NOT NULL,
    "bloqueId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "promedio" DOUBLE PRECISION NOT NULL,
    "publicadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromedioBloque_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Curso" ADD COLUMN "bloqueId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PromedioBloque_bloqueId_estudianteId_key" ON "PromedioBloque"("bloqueId", "estudianteId");

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "Bloque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromedioBloque" ADD CONSTRAINT "PromedioBloque_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "Bloque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromedioBloque" ADD CONSTRAINT "PromedioBloque_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
