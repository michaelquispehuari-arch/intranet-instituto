# Reset total de la base de datos en Railway (para empezar pruebas desde cero)

> **Contiene:** los comandos para borrar datos de Railway — todo (conservando o no el ADMIN) o solo estudiantes — y cómo evitar el error de SSL con R2 al correrlos. **El proyecto ya tiene usuarios reales desde 2026-07-23** — antes de usar esto, confirmar que de verdad hace falta borrar datos de producción, no es una operación libre de riesgo.

Objetivo: dejar la base de datos de Railway sin cursos, inscripciones, exámenes, asistencias, materiales, etc., para volver a probar todo el flujo creando profesores y cursos desde la app, como si fuera el primer uso real.

Hay tres formas. Usa la **Opción A** para un reset completo salvo que quieras también borrar el usuario ADMIN (**Opción B**), o la **Opción C** si solo quieres borrar estudiantes y dejar cursos/profesores como están.

## Antes de empezar: backup

Railway → proyecto → servicio **PostgreSQL** → pestaña **Backups** → forzar un backup manual. Es la red de seguridad si algo sale mal — con un backup reciente puedes restaurar en minutos.

## Opción A (recomendada): conservar el ADMIN, borrar todo lo demás

Ya existe un script hecho para esto: `backend/src/scripts/reset-demo-data.ts` (`npm run reset:demo`). Borra en una sola transacción, en orden seguro por las relaciones: respuestas de examen, envíos, preguntas, exámenes, notas manuales, asistencias, entregas de resumen, entregas de forum (Diplomado), materiales, registros semanales, habilitaciones de sustitutorio, inscripciones, sesiones, config de curso, cursos, y usuarios con rol `PROFESOR` o `ESTUDIANTE`. También borra todos los archivos del bucket de Cloudflare R2 si las variables `CLOUDFLARE_R2_*` están configuradas. **Conserva** los usuarios `ADMIN` y la tabla `Configuracion` (enlace de Zoom, etc.).

Pasos:

1. Copia la URL pública de la base de datos: Railway → PostgreSQL → pestaña **Connect** → `DATABASE_PUBLIC_URL` (la `DATABASE_URL` interna solo funciona entre servicios de Railway, no desde tu PC).
2. Compila el backend si no lo has hecho recientemente (el script corre desde `dist/`, no desde `src/`):
   ```
   cd backend
   npm run build
   ```
3. Ejecuta el reset apuntando explícitamente a Railway (en PowerShell):
   ```
   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL de Railway>"
   node dist/src/scripts/reset-demo-data.js --confirm-reset-demo
   ```
   El flag `--confirm-reset-demo` es obligatorio a propósito, para que no borres datos por accidente al copiar el comando sin pensarlo. Si solo pones `DATABASE_URL` y dejas las variables `CLOUDFLARE_R2_*` con los valores de ejemplo de tu `backend/.env` local, el paso de R2 falla con un error de SSL confuso (intenta conectarse a un host que no existe) — exporta también las 4 variables `CLOUDFLARE_R2_*` reales (Railway → backend → Variables) en la misma terminal antes de correr el script.
4. Verás una tabla en consola con el conteo de filas borradas por tabla. Al final, revisa que diga "Se conservaron usuarios ADMIN y configuracion global."
5. Entra a la intranet con tu cuenta ADMIN existente y empieza a crear profesores, cursos, matrículas, etc. desde la propia app — así pruebas el flujo real, no solo la base de datos.

Si no recuerdas el email/password del ADMIN que quedó, ábrelo con Prisma Studio (ver guía [03-base-de-datos-railway.md](./03-base-de-datos-railway.md)) filtrando por `rol = ADMIN`, o cambia su password directo en esa tabla (el campo es un hash bcrypt, no lo edites a mano — usa el flujo de "olvidé mi contraseña" de la app, o pídeme que genere uno).

## Opción B (nuclear): borrar absolutamente todo, incluido el ADMIN

Solo si quieres probar también el primer arranque (sin ningún usuario). Esto **dropea y recrea todas las tablas** según el schema actual, sin preguntar filas por tabla:

```
cd backend
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL de Railway>"
npx prisma migrate reset --skip-seed
```

- `--skip-seed` evita que corra automáticamente `prisma/seed.ts` (que crea 1 admin + 2 profesores + 10 estudiantes + 2 cursos de demo). Si en cambio quieres partir con esos datos de ejemplo listos, quita ese flag o corre después `npm run prisma:seed`.
- Sin ningún usuario ADMIN en la base, nadie puede entrar al panel de administración a crear profesores/cursos (esas rutas exigen rol ADMIN). Necesitas al menos un ADMIN inicial: la forma más simple es correr el seed completo (crea `admin@instituto.test` / `Password123!`) y luego borrar manualmente desde Prisma Studio los profesores/cursos/estudiantes de ejemplo que no quieras, dejando solo ese admin.
- Esta opción **no toca los archivos de R2** — si quieres limpiarlos también, corre igual el paso de R2 de la Opción A o bórralos manualmente desde el dashboard de Cloudflare.

## Opción C: borrar SOLO estudiantes (conserva cursos, profesores y admin)

Para cuando lo que sobra son estudiantes de prueba, pero los cursos/profesores/exámenes ya están bien
armados y no quieres tocarlos. Script: `backend/src/scripts/delete-all-students.ts` (`npm run delete:students`).
Borra, en una sola transacción, TODO lo que dependa de usuarios con rol `ESTUDIANTE`: respuestas de examen,
envíos de examen, notas manuales, asistencias, resúmenes (transcripciones), entregas de Forum, registros
semanales, habilitaciones de sustitutorio, inscripciones, y finalmente los propios usuarios `ESTUDIANTE`.
También borra en Cloudflare R2 los archivos de esas transcripciones/forums (si `CLOUDFLARE_R2_*` está
configurado). **No toca** cursos, sesiones, exámenes, preguntas, materiales, ni usuarios `ADMIN`/`PROFESOR`.

Local:
```
cd backend
npm run build
npm run delete:students -- --confirm-delete-students
```

Railway (mismo patrón que la Opción A — backup primero, y exporta `DATABASE_URL` apuntando a
`DATABASE_PUBLIC_URL` en la misma terminal, sin pegarlo en el chat):
```
cd backend
npm run build
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL de Railway>"
node dist/src/scripts/delete-all-students.js --confirm-delete-students
```

El flag `--confirm-delete-students` es obligatorio a propósito, igual que en la Opción A.

## Después del reset (cualquiera de las opciones)

- Revisa las variables de entorno del backend en Railway (`CLOUDFLARE_R2_*`, `JWT_SECRET`, etc.) — el reset no las toca, pero conviene confirmar que apuntan al entorno correcto antes de empezar a subir archivos de prueba.
- El frontend no necesita ningún cambio: al no haber sesión activa, redirige normal al login.
