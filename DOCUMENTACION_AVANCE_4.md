# Documentacion de avance 4 - Intranet Instituto

## Estado actual del proyecto

El proyecto completo:

```text
Paso 1 - Repositorio y entorno base: completado
Paso 2 - Base de datos con Prisma: completado
Paso 3 - Backend: Autenticacion: completado
Paso 4 - Backend: Modulos de negocio: en progreso
```

Modulo completado dentro del Paso 4:

```text
Modulo de Cursos - CRUD basico
```

Siguiente modulo recomendado:

```text
Modulo de Examenes
```

---

## Modulo de Cursos implementado

Archivos agregados:

```text
backend/src/controllers/course.controller.ts
backend/src/routes/course.routes.ts
backend/src/schemas/course.schema.ts
backend/src/services/course.service.ts
```

Archivos modificados:

```text
backend/src/app.ts
backend/src/utils/http-error.ts
```

Endpoints agregados:

```text
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses
PATCH  /api/courses/:id
DELETE /api/courses/:id
```

---

## Reglas de permisos aplicadas

```text
admin:
  Puede listar todos los cursos.
  Puede ver cualquier curso.
  Puede crear cursos.
  Puede editar cursos.
  Puede desactivar cursos.

profesor:
  Puede listar sus cursos activos.
  Puede ver solo sus cursos activos.
  No puede crear, editar ni desactivar cursos.

estudiante:
  Puede listar cursos activos donde esta inscrito.
  Puede ver solo cursos activos donde esta inscrito.
  No puede crear, editar ni desactivar cursos.
```

Nota:

`DELETE /api/courses/:id` no borra fisicamente la fila. Hace borrado logico con `activo = false`. Esto evita perder historial relacionado con examenes, materiales, notas e inscripciones.

---

## Validaciones de datos

Se usa Zod para validar:

```text
id de curso
nombre
descripcion
ciclo
anio
profesorId
activo
```

Reglas principales:

```text
nombre: minimo 3 caracteres, maximo 120
ciclo: entero entre 1 y 2
anio: entero entre 2020 y 2100
profesorId: debe existir, estar activo y tener rol PROFESOR
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
GET /api/courses como admin -> OK
GET /api/courses como profesor -> OK
GET /api/courses como estudiante -> OK
POST /api/courses como admin -> 201
PATCH /api/courses/:id como admin -> 200
DELETE /api/courses/:id como admin -> 200 y activo=false
POST /api/courses como profesor -> 403
```

---

## Siguiente paso recomendado

Continuar con:

```text
Modulo de Examenes
```

Orden sugerido:

```text
1. Crear endpoints para listar examenes por rol.
2. Crear endpoint para que profesor cree examen en uno de sus cursos.
3. Crear endpoint para publicar examen.
4. Crear endpoint para que estudiante envie respuestas.
5. Implementar idempotencia del envio con ExamenEnvio @@unique.
```
