-- Forums de Diplomado dejan de anclarse a Sesion (ya no se crean sesiones falsas
-- Dia 1/2/3). Se agrega EntregaForum, independiente de Sesion, anclada solo a
-- Curso + Usuario + dia (1..3).

CREATE TABLE IF NOT EXISTS "EntregaForum" (
    "id"           TEXT NOT NULL,
    "cursoId"      TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "dia"          INTEGER NOT NULL,
    "archivos"     JSONB NOT NULL,
    "entregadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota"         DOUBLE PRECISION,
    "revisadoEn"   TIMESTAMP(3),
    CONSTRAINT "EntregaForum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EntregaForum_cursoId_estudianteId_dia_key"
    ON "EntregaForum"("cursoId", "estudianteId", "dia");

DO $$ BEGIN
    ALTER TABLE "EntregaForum"
        ADD CONSTRAINT "EntregaForum_cursoId_fkey"
        FOREIGN KEY ("cursoId") REFERENCES "Curso"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "EntregaForum"
        ADD CONSTRAINT "EntregaForum_estudianteId_fkey"
        FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
