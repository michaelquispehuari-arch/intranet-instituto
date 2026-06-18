-- Migración incremental segura: agrega sesiones, resúmenes, configuración y ajustes de modelo
-- Diseñada para ejecutarse sobre la migración init 20260606015923

-- ============================================================
-- ENUMS NUEVOS (seguros con bloque DO $$)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "TipoCurso" AS ENUM ('REGULAR', 'ENTRENAMIENTO', 'ESPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "TipoMaterial" AS ENUM ('MATERIAL_CURSO', 'CAPTURA_PIZARRA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "EstadoResumen" AS ENUM ('PENDIENTE', 'ENTREGADO', 'REVISADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrigenHabilitacion" AS ENUM ('AUTOMATICO', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "EstadoCalificacion" AS ENUM ('AUTO', 'PENDIENTE', 'CALIFICADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "TipoNotaManual" AS ENUM ('EXPOSICION', 'ACTIVIDAD', 'PARTICIPACION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agregar valor ABIERTA al enum TipoPregunta existente
DO $$ BEGIN
    ALTER TYPE "TipoPregunta" ADD VALUE 'ABIERTA';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ============================================================

ALTER TABLE "Curso"
    ADD COLUMN IF NOT EXISTS "tipo" "TipoCurso" NOT NULL DEFAULT 'REGULAR';

ALTER TABLE "Inscripcion"
    ADD COLUMN IF NOT EXISTS "notaAsistencia" DOUBLE PRECISION;

ALTER TABLE "Examen"
    ADD COLUMN IF NOT EXISTS "revelarRespuestas" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "esSustitutorio"   BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RespuestaEstudiante"
    ADD COLUMN IF NOT EXISTS "puntajeManual"      DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "estadoCalificacion" "EstadoCalificacion" NOT NULL DEFAULT 'AUTO';

ALTER TABLE "Material"
    ADD COLUMN IF NOT EXISTS "sesionId" TEXT,
    ADD COLUMN IF NOT EXISTS "tipo"     "TipoMaterial" NOT NULL DEFAULT 'MATERIAL_CURSO';

ALTER TABLE "NotaManual"
    ADD COLUMN IF NOT EXISTS "tipo" "TipoNotaManual" NOT NULL DEFAULT 'ACTIVIDAD';

-- ============================================================
-- TABLAS NUEVAS
-- ============================================================

CREATE TABLE IF NOT EXISTS "Sesion" (
    "id"              TEXT NOT NULL,
    "cursoId"         TEXT NOT NULL,
    "fecha"           TIMESTAMP(3) NOT NULL,
    "titulo"          TEXT NOT NULL,
    "enlaceGrabacion" TEXT,
    "orden"           INTEGER NOT NULL,
    "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EntregaResumen" (
    "id"          TEXT NOT NULL,
    "sesionId"    TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "urlR2"       TEXT,
    "entregadoEn" TIMESTAMP(3),
    "fechaLimite" TIMESTAMP(3),
    "estado"      "EstadoResumen" NOT NULL DEFAULT 'PENDIENTE',
    "requerido"   BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EntregaResumen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HabilitacionSustitutorio" (
    "id"            TEXT NOT NULL,
    "estudianteId"  TEXT NOT NULL,
    "cursoId"       TEXT NOT NULL,
    "origen"        "OrigenHabilitacion" NOT NULL DEFAULT 'AUTOMATICO',
    "habilitadoPor" TEXT,
    "creadoEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabilitacionSustitutorio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Configuracion" (
    "id"            TEXT NOT NULL,
    "clave"         TEXT NOT NULL,
    "valor"         TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- ÍNDICES ÚNICOS NUEVOS
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS "EntregaResumen_sesionId_estudianteId_key"
    ON "EntregaResumen"("sesionId", "estudianteId");

CREATE UNIQUE INDEX IF NOT EXISTS "HabilitacionSustitutorio_estudianteId_cursoId_key"
    ON "HabilitacionSustitutorio"("estudianteId", "cursoId");

CREATE UNIQUE INDEX IF NOT EXISTS "Configuracion_clave_key"
    ON "Configuracion"("clave");

-- ============================================================
-- FOREIGN KEYS NUEVAS
-- ============================================================

DO $$ BEGIN
    ALTER TABLE "Sesion"
        ADD CONSTRAINT "Sesion_cursoId_fkey"
        FOREIGN KEY ("cursoId") REFERENCES "Curso"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntregaResumen"
        ADD CONSTRAINT "EntregaResumen_sesionId_fkey"
        FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntregaResumen"
        ADD CONSTRAINT "EntregaResumen_estudianteId_fkey"
        FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "HabilitacionSustitutorio"
        ADD CONSTRAINT "HabilitacionSustitutorio_estudianteId_fkey"
        FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "HabilitacionSustitutorio"
        ADD CONSTRAINT "HabilitacionSustitutorio_cursoId_fkey"
        FOREIGN KEY ("cursoId") REFERENCES "Curso"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Material"
        ADD CONSTRAINT "Material_sesionId_fkey"
        FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CAMBIO BREAKING: Asistencia pasa de (cursoId, fecha) a sesionId
-- Se borran los registros seed porque la estructura cambia.
-- ============================================================

DELETE FROM "Asistencia";

-- Eliminar restricción única vieja
DROP INDEX IF EXISTS "Asistencia_estudianteId_cursoId_fecha_key";

-- Eliminar FK a Curso
DO $$ BEGIN
    ALTER TABLE "Asistencia" DROP CONSTRAINT "Asistencia_cursoId_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Eliminar columnas viejas
ALTER TABLE "Asistencia" DROP COLUMN IF EXISTS "cursoId";
ALTER TABLE "Asistencia" DROP COLUMN IF EXISTS "fecha";

-- Agregar columnas nuevas (tabla vacía: NOT NULL es seguro)
ALTER TABLE "Asistencia" ADD COLUMN IF NOT EXISTS "sesionId"    TEXT;
ALTER TABLE "Asistencia" ADD COLUMN IF NOT EXISTS "observacion" TEXT;

-- Marcar sesionId como NOT NULL (tabla vacía)
DO $$ BEGIN
    ALTER TABLE "Asistencia" ALTER COLUMN "sesionId" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Nueva restricción única
CREATE UNIQUE INDEX IF NOT EXISTS "Asistencia_estudianteId_sesionId_key"
    ON "Asistencia"("estudianteId", "sesionId");

-- FK a Sesion
DO $$ BEGIN
    ALTER TABLE "Asistencia"
        ADD CONSTRAINT "Asistencia_sesionId_fkey"
        FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CAMBIO BREAKING: ConfigCurso — renombrar pesos 70/30 → 50/50
-- ============================================================

ALTER TABLE "ConfigCurso"
    ADD COLUMN IF NOT EXISTS "pesoAsistencia" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    ADD COLUMN IF NOT EXISTS "pesoAcademico"  DOUBLE PRECISION NOT NULL DEFAULT 0.5;

ALTER TABLE "ConfigCurso"
    DROP COLUMN IF EXISTS "pesoExamenes",
    DROP COLUMN IF EXISTS "pesoNotasManuales";
