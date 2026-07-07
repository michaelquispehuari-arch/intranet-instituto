-- Fecha limite (a nivel de sesion/dia) para el cierre de subida de material.
-- Aplica a todos los alumnos de esa sesion por igual, sin depender de que ya
-- exista una fila de EntregaResumen creada por el admin.
ALTER TABLE "Sesion" ADD COLUMN "fechaLimiteEntrega" TIMESTAMP(3);
