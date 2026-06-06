# Documentacion de avance 5 - Intranet Instituto

## Estado actual del proyecto

El proyecto completo:

```text
Paso 1 - Repositorio y entorno base: completado
Paso 2 - Base de datos con Prisma: completado
Paso 3 - Backend: Autenticacion: completado
Paso 4 - Backend: Modulos de negocio: en progreso
```

Modulos completados dentro del Paso 4:

```text
Modulo de Cursos - completado
Modulo de Examenes - completado
```

Siguiente modulo recomendado:

```text
Modulo de Materiales
```

---

## Modulo de Examenes implementado

Archivos agregados:

```text
backend/src/controllers/exam.controller.ts
backend/src/routes/exam.routes.ts
backend/src/schemas/exam.schema.ts
backend/src/services/exam.service.ts
```

Archivo modificado:

```text
backend/src/app.ts
```

Endpoints agregados:

```text
GET   /api/exams
GET   /api/exams/:id
POST  /api/exams
PATCH /api/exams/:id/publish
POST  /api/exams/:id/submit
```

---

## Reglas de permisos aplicadas

```text
admin:
  Puede listar todos los examenes.
  Puede ver cualquier examen con respuestas correctas.

profesor:
  Puede listar examenes de sus cursos.
  Puede crear examenes solo en sus cursos activos.
  Puede publicar examenes solo de sus cursos.
  Puede ver sus examenes con respuestas correctas.

estudiante:
  Puede listar examenes publicados de cursos donde esta inscrito.
  Puede ver examen disponible sin respuestaCorrecta.
  Puede enviar respuestas solo una vez por examen.
```

Nota:

El estudiante nunca envia puntaje. Envia solo respuestas. El backend recalcula el puntaje usando las preguntas almacenadas.

---

## Idempotencia del envio

`POST /api/exams/:id/submit` verifica primero si ya existe:

```text
(estudianteId, examenId)
```

Si el envio ya esta completado:

```text
Devuelve el resultado guardado sin recalcular ni duplicar datos.
```

Esto cumple la regla de la arquitectura para evitar doble procesamiento si el estudiante hace clic varias veces.

---

## Validaciones de datos

Se usa Zod para validar:

```text
titulo
descripcion
cursoId
duracionMinutos
disponibleDesde
disponibleHasta
preguntas
opciones
respuestaCorrecta
puntaje
respuestas del estudiante
```

Reglas principales:

```text
duracionMinutos: entero entre 1 y 300
preguntas: minimo 1, maximo 100
opciones por pregunta: minimo 2, maximo 6
respuestaCorrecta debe existir dentro de opciones
disponibleHasta debe ser posterior a disponibleDesde
```

---

## Validaciones realizadas

Desde:

```powershell
cd C:\intranet-instituto\backend
```

Comandos:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
```

Resultado:

```text
OK
```

Pruebas reales de endpoints:

```text
POST /api/exams como profesor -> 201
PATCH /api/exams/:id/publish como profesor -> 200
GET /api/exams/:id como estudiante inscrito -> 200
GET /api/exams/:id como estudiante no expone respuestaCorrecta -> OK
POST /api/exams/:id/submit como estudiante -> 200
Segundo POST /api/exams/:id/submit -> devuelve el mismo ExamenEnvio
```

Nota:

La prueba funcional creo un examen temporal en la base de desarrollo. No afecta el codigo ni produccion.

---

## Siguiente paso recomendado

Continuar con:

```text
Modulo de Materiales
```

Orden sugerido:

```text
1. Definir validacion de metadata de material.
2. Crear listado de materiales por curso y rol.
3. Preparar subida multipart/form-data.
4. Integrar Cloudflare R2 cuando existan credenciales reales.
5. Generar URL firmada para descarga.
```
