# Validacion y cambios — sesion actual

Fecha: 2026-06-06

---

## Cambio aplicado

Archivo: `backend/src/services/content.service.ts` — funcion `deleteContent`

Problema: el borrado de R2 ocurria antes del borrado en Postgres. Si R2 tenia exito pero Prisma fallaba, el registro quedaba en la BD apuntando a un objeto que ya no existia en R2.

Correccion: invertido el orden. Ahora se borra primero en Postgres y luego en R2. Si Postgres falla el archivo sigue en R2 y el usuario puede reintentar. Si R2 falla despues del borrado en Postgres, el objeto queda huerfano en R2 pero el sistema no queda en estado inconsistente visible al usuario.

---

## Validaciones ejecutadas y resultado

```
backend: npm.cmd run typecheck       -> OK
backend: npm.cmd run build           -> OK
backend: npm.cmd run prisma:validate -> OK (schema valido)
backend: npm.cmd run test:integration -> 1/1 pass

frontend: npm.cmd run typecheck      -> OK
frontend: npm.cmd run build          -> OK (12 rutas generadas)
frontend: npm.cmd audit --omit=dev   -> 0 vulnerabilities
```

---

## Estado confirmado listo para continuar

Los Pasos 1 a 4 de la arquitectura estan completos y validados:

- Paso 1: repositorio, ramas, .gitignore, .env.example — completo
- Paso 2: Prisma schema, migracion, seed — completo
- Paso 3: autenticacion JWT, bcrypt, middleware de roles — completo
- Paso 4: modulos backend cursos, examenes, materiales, calificaciones — completo y probado

El Paso 5 (frontend) tiene base funcional:

- Login con NextAuth Credentials conectado al backend
- Dashboard con modulos segun rol
- Pagina /grades conectada a GET /api/grades
- Middleware de rutas por rol funcionando
- Rutas base creadas pero sin conexion real: /exams, /exams/create, /content, /content/upload, /users, /settings

---

## Pendientes segun arquitectura

Paso 5 — completar frontend:
- Conectar /exams a GET /api/exams
- Crear pagina /exams/[id] para rendir examen individual
- Crear pagina /exams/[id]/results para ver resultado
- Conectar /exams/create a POST /api/exams
- Conectar /content a GET /api/content
- Conectar /content/upload a POST /api/content
- Conectar /users a gestion real de usuarios (ADMIN)
- Conectar /settings a configuracion (ADMIN)
- Completar /grades con acciones segun rol (PROFESOR crea notas, ADMIN configura pesos)

Paso 6 — servicios de soporte:
- Redis
- Bull Queue
- Email SMTP (Resend + nodemailer)
- Sentry en backend
- UptimeRobot

Paso 7: Nginx y Cloudflare
Paso 8: CI/CD GitHub Actions
Paso 9: lanzamiento
Paso 10: post-lanzamiento

---

## Reglas para continuar

- Trabajar siempre desde `C:\intranet-instituto`
- No usar carpeta de OneDrive
- No borrar ni revertir cambios locales sin autorizacion
- No subir archivos `.env` reales
- Ejecutar las 7 validaciones del bloque anterior antes de declarar algo como hecho
- El backend es la autoridad de seguridad — el frontend nunca calcula notas ni decide permisos reales
- Fuente de verdad de arquitectura: `C:\intranet-instituto\arquitectura_intranet_educativa.md`
- Estado consolidado del proyecto: `C:\intranet-instituto\DOCUMENTACION_CONSOLIDADA_AVANCE_ACTUAL.md`

---

## Avance aplicado - 2026-06-08

Paso 5 frontend - modulo de examenes:

- `/exams` conectado a `GET /api/exams`.
- `/exams/create` conectado a creacion real de examenes mediante proxy interno del frontend.
- `/exams/[id]` creado para ver/rendir examen individual.
- `/exams/[id]/results` creado para consultar resultados.
- Proxy interno agregado en Next para enviar creacion y respuestas sin exponer el token backend al navegador.
- Estilos agregados para formularios, preguntas, opciones, resultados y estados vacios.

Backend:

- Agregado `GET /api/exams/:id/results`.
- ADMIN y PROFESOR autorizado ven envios completados del examen.
- ESTUDIANTE solo ve su propio resultado si esta inscrito y ya envio el examen.

Validaciones ejecutadas:

```text
backend: npm.cmd run typecheck       -> OK
backend: npm.cmd run build           -> OK
backend: npm.cmd run prisma:validate -> OK
frontend: npm.cmd run typecheck      -> OK
frontend: npm.cmd run build          -> OK (15 rutas generadas)
frontend: npm.cmd audit --omit=dev   -> 0 vulnerabilities
```

Validacion pendiente:

```text
backend: npm.cmd run test:integration -> NO ejecutable correctamente porque PostgreSQL local no respondio en localhost:5432.
```

Servidor local:

```text
Frontend dev server iniciado en http://localhost:3000
GET /login -> 200
```

Nota:

```text
No se pudo usar el navegador integrado porque la instancia iab no estaba disponible.
```

---

## Avance aplicado - continuacion 2026-06-08

Paso 5 frontend - modulos conectados:

- `/content` conectado a `GET /api/content`.
- `/content/upload` conectado a `POST /api/content` mediante proxy interno Next con `multipart/form-data`.
- Descarga de materiales conectada a `GET /api/content/:id/download`, redirigiendo a la URL firmada generada por backend.
- Eliminacion de materiales conectada a `DELETE /api/content/:id` para ADMIN y PROFESOR.
- `/users` conectado a gestion real de usuarios para ADMIN.
- `/settings` conectado a configuracion real de calificaciones por curso.
- `/grades` ampliado para registrar notas manuales y asistencia desde el rol PROFESOR.
- `/courses` creado y conectado a `GET /api/courses`, `POST /api/courses`, `PATCH /api/courses/:id` y `DELETE /api/courses/:id`.
- Dashboard y middleware actualizados para incluir `/courses`.
- Filtros visuales agregados en `/courses`, `/content` y `/users`.

Backend:

- Agregado modulo administrativo de usuarios:
  - `GET /api/users`
  - `POST /api/users`
  - `PATCH /api/users/:id`
  - `DELETE /api/users/:id`
- Agregadas inscripciones administrativas en cursos:
  - `POST /api/courses/:id/enrollments`
  - `DELETE /api/courses/:id/enrollments/:studentId`
- El borrado de usuarios y cursos sigue siendo logico cuando aplica, evitando perdida innecesaria de historial.
- Integrado Sentry opcional en backend con `@sentry/node`.
- `SENTRY_DSN` ahora es opcional en `backend/src/config/env.ts`.
- Si no existe `SENTRY_DSN`, Sentry no se inicializa y el entorno local sigue funcionando igual.
- Los errores 500 se capturan con Sentry cuando el DSN esta configurado.

Archivos nuevos principales:

```text
backend/src/config/sentry.ts
backend/src/controllers/user.controller.ts
backend/src/routes/user.routes.ts
backend/src/schemas/user.schema.ts
backend/src/services/user.service.ts
frontend/src/app/courses/page.tsx
frontend/src/components/search-form.tsx
```

Dependencias agregadas:

```text
backend: @sentry/node
```

Validaciones ejecutadas:

```text
backend: npm.cmd run typecheck       -> OK
backend: npm.cmd run build           -> OK
backend: npm.cmd run prisma:validate -> OK
backend: npm.cmd audit --omit=dev    -> 0 vulnerabilities
frontend: npm.cmd run typecheck      -> OK
frontend: npm.cmd run build          -> OK (15 rutas generadas)
frontend: npm.cmd audit --omit=dev   -> 0 vulnerabilities
```

Validacion pendiente:

```text
backend: npm.cmd run test:integration -> pendiente de reintentar cuando PostgreSQL local este respondiendo.
```

Pendientes inmediatos actualizados:

```text
1. Probar flujo funcional completo con PostgreSQL local levantado.
2. Probar subida y descarga real a Cloudflare R2 con credenciales reales.
3. Implementar reset de password cuando existan Redis/email.
4. Implementar Bull Queue y email SMTP.
5. Continuar CI/CD, Cloudflare/Nginx y despliegue.
```

---

## Avance aplicado - Paso 6 inicial 2026-06-08

Servicios de soporte backend:

- Redis agregado con cliente reutilizable para datos temporales.
- BullMQ agregado como cola de tareas asincronas sobre Redis.
- Worker de email agregado:
  - `npm.cmd run dev:email-worker`
  - `npm.cmd run start:email-worker`
- Nodemailer agregado para envio SMTP.
- Variables SMTP completadas en `backend/.env.example`.
- `SENTRY_DSN` acepta valor vacio sin romper validacion local.

Reset de password:

- `POST /api/auth/forgot-password` creado.
- `POST /api/auth/reset-password` creado.
- El token temporal se guarda en Redis con expiracion de 1 hora.
- El correo de recuperacion se envia por cola, no de forma sincrona.
- El token se consume con `GETDEL` para evitar reutilizacion.
- La nueva contrasena se guarda con `bcrypt.hash(..., 12)`.

Frontend:

- `/forgot-password` creado para solicitar enlace de recuperacion.
- `/reset-password?token=...` creado para definir nueva contrasena.
- Proxies internos agregados:
  - `POST /api/password/forgot`
  - `POST /api/password/reset`
- Login actualizado con enlace a recuperacion.

Dependencias agregadas:

```text
backend: bullmq, ioredis, nodemailer
backend dev: @types/nodemailer
```

Decision tecnica:

```text
Se uso BullMQ en lugar de Bull clasico porque Bull 4 introducia vulnerabilidad moderada transitiva via uuid.
BullMQ mantiene el modelo de cola Redis de la arquitectura sin dejar npm audit con alertas.
```

Validaciones ejecutadas:

```text
backend: npm.cmd run typecheck        -> OK
backend: npm.cmd run build            -> OK
backend: npm.cmd run prisma:validate  -> OK
backend: npm.cmd run test:integration -> OK (1/1 pass, con permiso elevado por EPERM del sandbox)
backend: npm.cmd audit --omit=dev     -> 0 vulnerabilities
frontend: npm.cmd run typecheck       -> OK
frontend: npm.cmd run build           -> OK (19 rutas generadas)
frontend: npm.cmd audit --omit=dev    -> 0 vulnerabilities
```

Pendientes inmediatos actualizados:

```text
1. Probar reset de password con Redis y SMTP reales levantados.
2. Probar flujo funcional completo en navegador.
3. Probar subida y descarga real a Cloudflare R2 con credenciales reales.
4. Agregar UptimeRobot cuando exista URL publica.
5. Continuar CI/CD, Cloudflare/Nginx y despliegue.
```

---

## Avance aplicado - Paso 7 y 8 inicial 2026-06-08

Infraestructura versionada:

- Agregado `.github/workflows/ci.yml`.
- El CI valida backend y frontend en push/pull request hacia `dev` y `main`.
- Backend CI usa PostgreSQL 15 y Redis 7 como servicios.
- Backend CI ejecuta:
  - `npm ci`
  - `npm run prisma:validate`
  - `npx prisma migrate deploy`
  - `npm run prisma:seed`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:integration`
  - `npm audit --omit=dev`
- Frontend CI ejecuta:
  - `npm ci`
  - `npm run typecheck`
  - `npm run build`
  - `npm audit --omit=dev`

Nginx:

- Agregado `infra/nginx/intranet.conf`.
- Proxy configurado para:
  - Frontend en `127.0.0.1:3000`.
  - Backend `/api/` y `/health` en `127.0.0.1:4000`.
  - `client_max_body_size 500m` para coincidir con materiales educativos.
- Agregado `infra/README.md` con notas minimas de uso.

Legal:

- Agregada ruta publica `/privacy`.
- Login enlaza a politica de privacidad.
- La pagina cubre datos tratados, finalidad, roles de acceso, seguridad, menores y conservacion.

Validaciones ejecutadas:

```text
frontend: npm.cmd run typecheck    -> OK
frontend: npm.cmd run build        -> OK (20 rutas generadas)
frontend: npm.cmd audit --omit=dev -> 0 vulnerabilities
```

Pendientes inmediatos actualizados:

```text
1. Probar CI en GitHub despues de subir cambios.
2. Definir proveedor de deploy y secretos reales para CD.
3. Probar reset de password con Redis y SMTP reales levantados.
4. Probar subida y descarga real a Cloudflare R2 con credenciales reales.
5. Configurar Cloudflare, Nginx real y UptimeRobot cuando exista dominio/URL publica.
```

---

## Checklist pendiente para lanzar la pagina

Pruebas locales completas:

```text
Login con ADMIN, PROFESOR y ESTUDIANTE.
Dashboard por rol.
Cursos: crear, editar, desactivar y matricular estudiantes.
Examenes: crear, publicar, rendir y ver resultados.
Materiales: listar, subir, descargar y eliminar.
Calificaciones: notas manuales, asistencia y configuracion de pesos.
Usuarios: crear, editar y desactivar cuentas.
Settings: configuracion academica desde ADMIN.
Politica de privacidad publica.
Reset de password con Redis y SMTP.
```

Servicios reales necesarios:

```text
PostgreSQL real.
Redis real.
SMTP real.
Cloudflare R2 real.
Sentry real.
Dominio real en Cloudflare.
Hosting para frontend, backend y worker de email.
```

Produccion y operacion:

```text
Variables .env reales configuradas en el hosting.
Nginx con dominio real si se usa servidor propio.
Cloudflare con HTTPS activo.
CI pasando en GitHub.
Deploy automatizado cuando se defina Railway/Render.
UptimeRobot apuntando a la URL publica.
Backups automaticos de PostgreSQL verificados.
Prueba final movil y escritorio.
```

---

## Avance aplicado - despliegue demo publico 2026-06-09 America/Lima

Repositorio:

```text
https://github.com/michaelquispehuari-arch/intranet-instituto.git
Rama: dev
Commit: 9bdb8c5 Completar frontend e infraestructura inicial
```

Servicios:

```text
Railway:
  - backend
  - PostgreSQL

Render:
  - frontend
```

URLs:

```text
Frontend:
https://intranet-instituto-frontend.onrender.com

Backend health:
https://intranet-instituto-production.up.railway.app/health
```

Backend Railway:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm run start
Healthcheck Path: /health
```

Frontend Render:

```text
Root Directory: frontend
Build Command: npm ci && npm run build
Start Command: npm run start
Language: Node
Region: Oregon US West
```

Variables backend necesarias:

```text
NODE_ENV
PORT
JWT_SECRET
FRONTEND_URL
DATABASE_URL
REDIS_URL
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SENTRY_DSN
```

Variables frontend necesarias:

```text
BACKEND_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
```

Nota importante:

```text
No documentar valores reales de DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET,
R2, SMTP_PASS ni tokens.
Railway fallo con P1001 usando la URL interna postgres.railway.internal.
Para el demo se uso el valor de DATABASE_PUBLIC_URL de Railway PostgreSQL como valor de DATABASE_URL en backend.
```

Comandos ejecutados en Railway backend Console:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Credenciales seed para demo:

```text
admin@instituto.test
profesor.matematica@instituto.test
profesor.comunicacion@instituto.test
estudiante1@instituto.test

Password:
Password123!
```

Validacion real:

```text
Frontend Render desplegado correctamente.
Backend Railway desplegado correctamente.
PostgreSQL Railway migrado y seed aplicado.
Login desde el frontend publico probado correctamente con credenciales seed.
```

Pendientes posteriores al demo:

```text
Configurar Cloudflare R2 real.
Configurar Redis real compatible con BullMQ.
Configurar SMTP real.
Desplegar worker de email cuando haya servicio disponible.
Configurar Sentry real.
Configurar UptimeRobot.
Comprar dominio solo despues de validar el demo.
```

---

## Avance aplicado - robustez de servicios externos 2026-06-10

Backend:

- Cloudflare R2 dejo de ser obligatorio para iniciar la API.
- Si R2 no esta configurado, las operaciones de materiales que lo necesitan devuelven 503 con mensaje claro.
- Agregado `GET /health/ready` para diagnosticar PostgreSQL, Redis, Cloudflare R2, SMTP y Sentry.
- `GET /health` se mantiene liviano para el healthcheck del hosting.
- BullMQ ahora respeta URLs Redis con TLS (`rediss://`), necesarias en algunos proveedores.
- El backend cierra la cola de email al apagar para evitar conexiones abiertas.
- El email-worker inicializa Sentry y valida SMTP al iniciar.

Frontend:

- Los proxies internos preservan `status` y `message` del backend.
- Los formularios de crear examen, enviar examen y subir material muestran el error real devuelto por la API.
- `/settings` muestra al ADMIN el estado de PostgreSQL, Redis, R2, SMTP y Sentry usando `/health/ready`.

Validaciones ejecutadas:

```text
backend: npm.cmd run typecheck        -> OK
backend: npm.cmd run build            -> OK
backend: npm.cmd run prisma:validate  -> OK
backend: npm.cmd run test:integration -> OK (1/1 pass)
backend: npm.cmd audit --omit=dev     -> 0 vulnerabilities
frontend: npm.cmd run typecheck       -> OK
frontend: npm.cmd run build           -> OK (20 rutas generadas)
frontend: npm.cmd audit --omit=dev    -> 0 vulnerabilities
```

Pendiente real para que todo funcione en demo/produccion:

```text
Configurar Redis real.
Configurar SMTP real.
Configurar R2 real.
Desplegar email-worker como servicio separado.
Probar /health/ready en la URL publica del backend.
```

Estado de variables reportado por el propietario - 2026-06-10:

```text
Render frontend:
BACKEND_URL configurado.
NEXTAUTH_URL configurado.
NEXTAUTH_SECRET configurado.

Railway backend:
DATABASE_URL configurado, pero su valor real fue expuesto en chat y debe rotarse.
JWT_SECRET configurado para demo.
FRONTEND_URL configurado.
NODE_ENV=production.
PORT=4000.

Pendientes reales en Railway:
REDIS_URL sigue pendiente.
R2 usa placeholders temporales.
SMTP usa placeholders temporales.
SENTRY_DSN esta vacio.
```

Regla:

```text
No documentar valores reales de DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET, SMTP_PASS, R2 ni tokens.
Los placeholders como temporal, pendiente y smtp.example.com no cuentan como configuracion valida.
```

---

## Avance aplicado - control real de tiempo en examenes 2026-06-14

Backend:

- Al abrir un examen como ESTUDIANTE, el backend crea o reutiliza el intento real en `ExamenEnvio`.
- `POST /api/exams/:id/submit` rechaza envios cuando el intento supero `duracionMinutos`.
- Se mantiene idempotencia: si el examen ya fue completado, el backend devuelve el resultado guardado.
- Se agrega un margen tecnico de 30 segundos para evitar fallos por latencia al enviar.

Frontend:

- `/exams/[id]` muestra el tiempo restante basado en el intento real del backend.
- Si el examen ya fue enviado, la pagina muestra acceso directo a resultados en vez de un formulario bloqueado.

Pruebas:

- Agregada `backend/tests/integration/exams.test.ts`.
- `npm.cmd run test:integration` ahora ejecuta pruebas de calificaciones y examenes.

Validaciones ejecutadas:

```text
backend: npm.cmd run typecheck        -> OK
backend: npm.cmd run build            -> OK
backend: npm.cmd run prisma:validate  -> OK
backend: npm.cmd run test:integration -> OK (2/2 pass)
frontend: npm.cmd run typecheck       -> OK
frontend: npm.cmd run build           -> OK (20 rutas generadas)
```

---

## Avance aplicado - readiness real y guia demo 2026-06-14

Backend:

- `/health/ready` ahora verifica acceso real a Cloudflare R2 con `HeadBucket`.
- `/health/ready` ahora verifica conexion real SMTP con `transporter.verify()`.
- SMTP usa timeouts de 5 segundos para evitar esperas largas cuando el proveedor no responde.
- Si R2 o SMTP tienen variables pero credenciales/bucket incorrectos, el estado cambia a `error`.

Infraestructura:

- Agregado `infra/DEPLOY_DEMO.md` con pasos para Railway, Render, Cloudflare R2, SMTP y email-worker.
- `infra/README.md` apunta a la guia demo.

Pendiente operativo:

```text
Configurar SMTP real.
Desplegar email-worker como servicio separado.
Validar /health/ready hasta que SMTP aparezca como ok.
```

---

## Avance operativo - Railway Redis y Cloudflare R2 validados 2026-06-14

Servicios reales:

```text
PostgreSQL Railway -> OK
Redis Railway      -> OK
Cloudflare R2      -> OK
SMTP               -> pendiente
Sentry             -> pendiente opcional
```

Resultado reportado de `/health/ready`:

```text
postgres: ok
redis: ok
r2: ok
smtp: faltante
sentry: faltante
```

Prueba funcional real:

```text
Profesor subio un PDF desde /content/upload.
El archivo se guardo en Cloudflare R2.
La descarga desde la pagina funciono correctamente.
```

Nota de seguridad:

```text
Un token R2 real fue expuesto en chat durante la configuracion.
Debe quedar revocado y reemplazado por otro token no expuesto.
No documentar Access Key ID, Secret Access Key, token cfat, DATABASE_URL ni otros secretos.
```

---

## Decision operativa - presupuesto y lanzamiento 2026-06-14

Presupuesto disponible reportado:

```text
USD 5 mensuales aproximadamente.
```

Decision recomendada:

```text
Pagar primero Railway.
Mantener Render en plan gratuito por ahora.
No mover frontend a Railway todavia para no aumentar consumo del presupuesto.
```

Motivo:

```text
Railway contiene backend, PostgreSQL y Redis.
Si backend/base de datos fallan, la aplicacion no funciona.
Si Render gratuito tarda en despertar, afecta la primera carga del frontend, pero no rompe datos ni API.
```

Estado de lanzamiento:

```text
La pagina esta en estado demo funcional avanzada.
No esta aun en lanzamiento final institucional.
```

Pendientes para lanzamiento final:

```text
Comprar dominio.
Configurar Cloudflare DNS con el dominio.
Configurar SMTP real con dominio verificado.
Desplegar email-worker.
Rotar cualquier secreto que fue expuesto en chat.
Actualizar politica de privacidad con datos reales del instituto.
Hacer prueba completa por roles antes de compartir con estudiantes.
```

Proyecto/volumen Railway creado por error:

```text
Si el proyecto equivocado solo muestra un Volume sin servicios conectados, primero verificar que no sea el proyecto intranet-instituto.
Si NO contiene backend, PostgreSQL activo ni Redis, puede eliminarse desde Delete Volume y luego Project Settings > Danger Zone > Delete Project.
No borrar el proyecto donde estan backend, PostgreSQL/progressq y Redis.
```
