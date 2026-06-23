-- AddColumn: ingresoHastaMin to Examen (minutes after start that students can still enter)
ALTER TABLE "Examen" ADD COLUMN "ingresoHastaMin" INTEGER NOT NULL DEFAULT 10;
