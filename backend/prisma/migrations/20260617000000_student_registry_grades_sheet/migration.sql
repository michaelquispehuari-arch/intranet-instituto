DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModoEstudio') THEN
        CREATE TYPE "ModoEstudio" AS ENUM ('SINCRONICO', 'ASINCRONICO', 'MIXTO');
    END IF;
END $$;

ALTER TABLE "Usuario"
    ADD COLUMN IF NOT EXISTS "codigo" TEXT,
    ADD COLUMN IF NOT EXISTS "modo" "ModoEstudio" NOT NULL DEFAULT 'SINCRONICO',
    ADD COLUMN IF NOT EXISTS "iglesia" TEXT,
    ADD COLUMN IF NOT EXISTS "pais" TEXT,
    ADD COLUMN IF NOT EXISTS "semestreIngreso" INTEGER,
    ADD COLUMN IF NOT EXISTS "anioIngreso" INTEGER,
    ADD COLUMN IF NOT EXISTS "dni" TEXT,
    ADD COLUMN IF NOT EXISTS "telefono" TEXT,
    ADD COLUMN IF NOT EXISTS "fechaNacimiento" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "coordinador" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_codigo_key" ON "Usuario"("codigo");

ALTER TABLE "EntregaResumen"
    ADD COLUMN IF NOT EXISTS "notaTranscripcion" DOUBLE PRECISION;

ALTER TABLE "ConfigCurso"
    ADD COLUMN IF NOT EXISTS "numDias" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS "RegistroSemanal" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "modo" "ModoEstudio" NOT NULL DEFAULT 'SINCRONICO',
    "numDias" INTEGER NOT NULL DEFAULT 3,
    "celdas" JSONB,
    "notaAsistencia" DOUBLE PRECISION,
    "notaExamenNorm" DOUBLE PRECISION,
    "notaExamenRecup" DOUBLE PRECISION,
    "notaFinal" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegistroSemanal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RegistroSemanal_estudianteId_cursoId_key"
    ON "RegistroSemanal"("estudianteId", "cursoId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RegistroSemanal_estudianteId_fkey'
    ) THEN
        ALTER TABLE "RegistroSemanal"
            ADD CONSTRAINT "RegistroSemanal_estudianteId_fkey"
            FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RegistroSemanal_cursoId_fkey'
    ) THEN
        ALTER TABLE "RegistroSemanal"
            ADD CONSTRAINT "RegistroSemanal_cursoId_fkey"
            FOREIGN KEY ("cursoId") REFERENCES "Curso"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
