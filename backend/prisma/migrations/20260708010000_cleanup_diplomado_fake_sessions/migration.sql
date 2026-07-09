-- Las sesiones falsas "Dia 1/2/3" que el codigo viejo creaba al crear un
-- curso Diplomado ya no se generan (ver migracion add_entrega_forum). Se
-- eliminan las que quedaron de cursos creados antes de ese cambio, junto
-- con datos huerfanos ligados a ellas (ya reemplazados por EntregaForum).
-- Solo afecta sesiones que siguen intactas como placeholder (sin link de
-- grabacion guardado), para no tocar clases reales que un admin haya usado.

DELETE FROM "EntregaResumen"
WHERE "sesionId" IN (
  SELECT s."id" FROM "Sesion" s
  JOIN "Curso" c ON c."id" = s."cursoId"
  WHERE c."tipo" = 'DIPLOMADO'
    AND s."orden" IN (1, 2, 3)
    AND s."titulo" IN ('Día 1', 'Día 2', 'Día 3')
    AND s."enlaceGrabacion" IS NULL
);

DELETE FROM "Asistencia"
WHERE "sesionId" IN (
  SELECT s."id" FROM "Sesion" s
  JOIN "Curso" c ON c."id" = s."cursoId"
  WHERE c."tipo" = 'DIPLOMADO'
    AND s."orden" IN (1, 2, 3)
    AND s."titulo" IN ('Día 1', 'Día 2', 'Día 3')
    AND s."enlaceGrabacion" IS NULL
);

UPDATE "Material" SET "sesionId" = NULL
WHERE "sesionId" IN (
  SELECT s."id" FROM "Sesion" s
  JOIN "Curso" c ON c."id" = s."cursoId"
  WHERE c."tipo" = 'DIPLOMADO'
    AND s."orden" IN (1, 2, 3)
    AND s."titulo" IN ('Día 1', 'Día 2', 'Día 3')
    AND s."enlaceGrabacion" IS NULL
);

DELETE FROM "Sesion" s
USING "Curso" c
WHERE c."id" = s."cursoId"
  AND c."tipo" = 'DIPLOMADO'
  AND s."orden" IN (1, 2, 3)
  AND s."titulo" IN ('Día 1', 'Día 2', 'Día 3')
  AND s."enlaceGrabacion" IS NULL;
