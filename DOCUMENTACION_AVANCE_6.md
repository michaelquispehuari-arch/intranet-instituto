# Documentacion de avance 6 - Intranet Instituto

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
Modulo de Materiales - completado a nivel de codigo
```

Siguiente modulo recomendado:

```text
Modulo de Calificaciones
```

---

## Modulo de Materiales implementado

Ruta base:

```text
/api/content
```

Archivos agregados:

```text
backend/src/controllers/content.controller.ts
backend/src/routes/content.routes.ts
backend/src/schemas/content.schema.ts
backend/src/services/content.service.ts
backend/src/middleware/upload.middleware.ts
backend/src/utils/r2.ts
```

Archivos modificados:

```text
backend/src/app.ts
backend/src/config/env.ts
backend/src/middleware/error.middleware.ts
backend/package.json
backend/package-lock.json
```

---

## Endpoints agregados

```text
GET    /api/content
GET    /api/content/:id
POST   /api/content
GET    /api/content/:id/download
DELETE /api/content/:id
```

`POST /api/content` recibe:

```text
multipart/form-data
campo file
campo cursoId
campo nombre opcional
campo descripcion opcional
```

---

## Reglas de permisos aplicadas

```text
admin:
  Puede listar y ver cualquier material.
  Puede eliminar materiales.

profesor:
  Puede listar materiales de sus cursos.
  Puede subir materiales solo a sus cursos activos.
  Puede generar descarga de sus materiales.
  Puede eliminar sus materiales.

estudiante:
  Puede listar y descargar materiales solo de cursos donde esta inscrito.
```

---

## Integracion con Cloudflare R2

Se agrego cliente compatible S3:

```text
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
```

Variables requeridas por el backend:

```text
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
```

Regla importante:

PostgreSQL guarda la clave privada del objeto en `Material.urlR2`. No se guarda URL publica. La descarga usa URL firmada temporal de 15 minutos.

---

## Validaciones de archivos

Tipos permitidos:

```text
pdf
mp4
mp3
docx
pptx
xlsx
jpg
jpeg
png
```

Tamano maximo:

```text
500 MB
```

El archivo se guarda temporalmente en:

```text
backend/tmp/uploads
```

Luego se sube a R2 y el temporal se elimina.

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
npm.cmd audit --omit=dev
```

Resultado:

```text
OK
0 vulnerabilities
```

Pruebas reales sin depender de R2:

```text
GET /api/content como profesor -> 200
GET /api/content como estudiante -> 200
POST /api/content sin archivo -> 403 Archivo requerido
```

No se probo subida real a R2 porque requiere credenciales Cloudflare R2 validas y acceso externo.

Nota:

El AWS SDK muestra una advertencia informativa indicando que versiones futuras publicadas despues de enero de 2027 requeriran Node 22. El proyecto sigue en Node 20 LTS segun la arquitectura actual y `npm audit` queda limpio.

---

## Siguiente paso recomendado

Continuar con:

```text
Modulo de Calificaciones
```

Orden sugerido:

```text
1. Registro/listado de notas manuales por profesor.
2. Vista de notas por estudiante.
3. Calculo de promedio usando ConfigCurso.
4. Restricciones por curso, profesor e inscripcion.
```
