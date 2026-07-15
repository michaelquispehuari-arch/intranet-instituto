# Base de datos (PostgreSQL en Railway)

## Cómo ver y editar datos reales

1. Entra al proyecto en Railway → servicio PostgreSQL → pestaña **Data**. Railway trae un editor de tablas integrado, sirve para mirar/editar filas puntuales sin instalar nada.
2. Para algo más cómodo (como una tabla de Excel con relaciones), usa **Prisma Studio** desde tu PC, apuntando a la DB de Railway:
   ```
   DATABASE_URL="<url pública de Railway>" npx prisma studio --schema backend/prisma/schema.prisma
   ```
   Copia el `DATABASE_URL` público desde Railway → PostgreSQL → pestaña **Connect** → `DATABASE_PUBLIC_URL` (la interna `DATABASE_URL` solo funciona entre servicios de Railway, no desde tu PC).
3. **Nunca** edites datos de producción a mano si hay una acción equivalente en la intranet (crear usuario, matricular, etc.) — hazlo desde la app para no romper reglas que el backend aplica (ej. borrado lógico, no físico).

## Cómo corren las migraciones

El esquema vive en `backend/prisma/schema.prisma`. Cada cambio de estructura (tabla nueva, columna nueva) se guarda como un archivo SQL en `backend/prisma/migrations/<fecha>_<nombre>/migration.sql`.

- **En desarrollo local**: `npm run prisma:migrate` (dentro de `backend/`) — te pregunta el nombre de la migración y la aplica a tu DB local.
- **En Railway**: pasa solo, automático. El comando de arranque del backend es:
  ```
  npx prisma migrate deploy && node dist/src/server.js
  ```
  (`backend/package.json`, script `start`). Cada vez que Railway redespliega, aplica las migraciones pendientes antes de levantar el servidor. No hace falta correr nada a mano.
- Si una migración falla en Railway, el backend NO arranca (falla el healthcheck `/health`) — revisa los logs de deploy en Railway para ver el error de SQL exacto.

## Seed (datos de prueba)

`npm run prisma:seed` (dentro de `backend/`) crea usuarios y cursos de prueba: 1 admin, 2 profesores, 10 estudiantes, 2 cursos. Contraseña de todos: `Password123!` (ver `backend/prisma/seed.ts` para los emails exactos). Pensado para local/demo, no para producción con usuarios reales.

## Reset completo de datos de demo

`npm run reset:demo` (`backend/src/scripts/reset-demo-data.ts`) **borra todo**: filas de la base de datos Y archivos en Cloudflare R2. Requiere pasar `--confirm-reset-demo` explícito para evitar un borrado accidental. Úsalo solo para limpiar una demo pública entre pruebas, nunca contra datos reales de estudiantes.

## Backups

Railway hace backups automáticos según el plan contratado (revisar en el dashboard del servicio PostgreSQL → pestaña **Backups**). Antes de correr `reset:demo` o una migración riesgosa en producción, conviene forzar un backup manual desde ahí.
