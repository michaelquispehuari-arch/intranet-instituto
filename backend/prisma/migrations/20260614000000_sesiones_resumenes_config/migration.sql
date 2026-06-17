-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'PROFESOR', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('REGULAR', 'ENTRENAMIENTO', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "TipoPregunta" AS ENUM ('OPCION_MULTIPLE', 'VERDADERO_FALSO', 'ABIERTA');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('MATERIAL_CURSO', 'CAPTURA_PIZARRA');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'TARDANZA');

-- CreateEnum
CREATE TYPE "EstadoResumen" AS ENUM ('PENDIENTE', 'ENTREGADO', 'REVISADO');

-- CreateEnum
CREATE TYPE "OrigenHabilitacion" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateEnum
CREATE TYPE "EstadoCalificacion" AS ENUM ('AUTO', 'PENDIENTE', 'CALIFICADA');

-- CreateEnum
CREATE TYPE "TipoNotaManual" AS ENUM ('EXPOSICION', 'ACTIVIDAD', 'PARTICIPACION');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ciclo" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "profesorId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tipo" "TipoCurso" NOT NULL DEFAULT 'REGULAR',

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notaAsistencia" DOUBLE PRECISION,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL,
    "enlaceGrabacion" TEXT,
    "orden" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaResumen" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "urlR2" TEXT,
    "entregadoEn" TIMESTAMP(3),
    "fechaLimite" TIMESTAMP(3),
    "estado" "EstadoResumen" NOT NULL DEFAULT 'PENDIENTE',
    "requerido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EntregaResumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabilitacionSustitutorio" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "origen" "OrigenHabilitacion" NOT NULL DEFAULT 'AUTOMATICO',
    "habilitadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabilitacionSustitutorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Examen" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "cursoId" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "publicadoEn" TIMESTAMP(3),
    "disponibleDesde" TIMESTAMP(3),
    "disponibleHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revelarRespuestas" BOOLEAN NOT NULL DEFAULT true,
    "esSustitutorio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Examen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL,
    "examenId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPregunta" NOT NULL DEFAULT 'OPCION_MULTIPLE',
    "opciones" JSONB NOT NULL,
    "respuestaCorrecta" TEXT NOT NULL,
    "puntaje" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamenEnvio" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "examenId" TEXT NOT NULL,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEn" TIMESTAMP(3),
    "puntajeTotal" DOUBLE PRECISION,
    "completado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExamenEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespuestaEstudiante" (
    "id" TEXT NOT NULL,
    "envioId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "esCorrecta" BOOLEAN NOT NULL,
    "puntajeObtenido" DOUBLE PRECISION NOT NULL,
    "puntajeManual" DOUBLE PRECISION,
    "estadoCalificacion" "EstadoCalificacion" NOT NULL DEFAULT 'AUTO',

    CONSTRAINT "RespuestaEstudiante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cursoId" TEXT NOT NULL,
    "sesionId" TEXT,
    "profesorId" TEXT NOT NULL,
    "urlR2" TEXT NOT NULL,
    "tipoArchivo" TEXT NOT NULL,
    "tamanoBytes" BIGINT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL DEFAULT 'MATERIAL_CURSO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaManual" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoNotaManual" NOT NULL DEFAULT 'ACTIVIDAD',

    CONSTRAINT "NotaManual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "observacion" TEXT,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigCurso" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "pesoAsistencia" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "pesoAcademico" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "notaAprobatoria" DOUBLE PRECISION NOT NULL DEFAULT 11,

    CONSTRAINT "ConfigCurso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_estudianteId_cursoId_key" ON "Inscripcion"("estudianteId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaResumen_sesionId_estudianteId_key" ON "EntregaResumen"("sesionId", "estudianteId");

-- CreateIndex
CREATE UNIQUE INDEX "HabilitacionSustitutorio_estudianteId_cursoId_key" ON "HabilitacionSustitutorio"("estudianteId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_clave_key" ON "Configuracion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "ExamenEnvio_estudianteId_examenId_key" ON "ExamenEnvio"("estudianteId", "examenId");

-- CreateIndex
CREATE UNIQUE INDEX "Asistencia_estudianteId_sesionId_key" ON "Asistencia"("estudianteId", "sesionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigCurso_cursoId_key" ON "ConfigCurso"("cursoId");

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaResumen" ADD CONSTRAINT "EntregaResumen_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaResumen" ADD CONSTRAINT "EntregaResumen_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabilitacionSustitutorio" ADD CONSTRAINT "HabilitacionSustitutorio_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabilitacionSustitutorio" ADD CONSTRAINT "HabilitacionSustitutorio_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examen" ADD CONSTRAINT "Examen_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "Examen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenEnvio" ADD CONSTRAINT "ExamenEnvio_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamenEnvio" ADD CONSTRAINT "ExamenEnvio_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "Examen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaEstudiante" ADD CONSTRAINT "RespuestaEstudiante_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "ExamenEnvio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaEstudiante" ADD CONSTRAINT "RespuestaEstudiante_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaManual" ADD CONSTRAINT "NotaManual_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaManual" ADD CONSTRAINT "NotaManual_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaManual" ADD CONSTRAINT "NotaManual_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "Sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigCurso" ADD CONSTRAINT "ConfigCurso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

