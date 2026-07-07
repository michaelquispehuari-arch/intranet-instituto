-- AlterEnum: agrega el valor DIPLOMADO a TipoCurso (cursos sin examen, con nota calculada
-- desde el promedio de entregas diarias de video/informe en vez del puntaje del examen)
ALTER TYPE "TipoCurso" ADD VALUE 'DIPLOMADO';
