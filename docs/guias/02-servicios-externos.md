# Servicios externos: Railway, Render, Cloudflare R2

Guía operativa detallada ya existente: `infra/DEPLOY_DEMO.md` (no duplicar secretos, solo referencia). Esta guía explica el "para qué" de cada servicio y dónde toca el código.

## Mapa general

```
Render   → frontend (Next.js)
Railway  → backend (Express) + PostgreSQL + Redis
Cloudflare R2 → archivos (materiales de curso, PDFs, etc.)
SMTP (ej. Resend) → correos de recuperación de contraseña
```

## Railway — backend, PostgreSQL, Redis

Un solo proyecto Railway con tres servicios:

- **Backend**: Root Directory `backend`, build `npm ci && npm run build`, start `npm run start` (que corre `prisma migrate deploy` antes de arrancar — ver `backend/package.json`). Healthcheck en `/health`.
- **PostgreSQL**: Railway te da un `DATABASE_URL` — cópialo tal cual a la variable `DATABASE_URL` del servicio backend.
- **Redis**: igual, Railway da un `REDIS_URL`.

El backend valida TODAS sus variables de entorno al arrancar con Zod (`backend/src/config/env.ts`). Si falta `JWT_SECRET` o está mal formado, el proceso no arranca — es intencional, mejor que fallar a medias.

Variables que se configuran en el dashboard de Railway (nunca en el repo): ver la lista completa en `infra/DEPLOY_DEMO.md`.

Endpoint para confirmar que todo está bien conectado tras un deploy: `GET /health/ready` — devuelve el estado de postgres, redis, r2, smtp y sentry por separado. Si un servicio no está configurado, aparece `"status":"missing"` (no es un error fatal, es informativo).

## Render — frontend

Root Directory `frontend`, build `npm ci && npm run build`, start `npm run start`.

Variables clave:
- `BACKEND_URL` — debe apuntar a la URL pública del backend en Railway. Si cambia la URL de Railway, hay que actualizar esta variable y redesplegar.
- `NEXTAUTH_URL` — la URL pública del propio frontend en Render.
- `NEXTAUTH_SECRET` — distinto del `JWT_SECRET` del backend (son secretos independientes, uno firma el JWT del backend, el otro cifra la cookie de sesión de NextAuth).

Si `BACKEND_URL` o `NEXTAUTH_URL` quedan mal puestos (ej. apuntando a `localhost` en producción), el login funciona pero las llamadas al backend fallan con error de conexión. Este fue justo el tipo de error encontrado y corregido en `frontend/.env` local durante la auditoría del 2026-07-01 (puertos de una prueba temporal que quedaron puestos) — ver [guía 5](./05-auditoria-y-pruebas.md).

## Cloudflare R2 — archivos

Uso en el código: `backend/src/utils/r2.ts`. El bucket es privado (nunca público); PostgreSQL solo guarda la clave del objeto (`urlR2` en el schema de Prisma), y el backend genera una URL firmada temporal cuando alguien necesita descargar un archivo.

Variables necesarias (Railway, servicio backend):
```
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
```

Pasos para crear el bucket y el token: ver `infra/DEPLOY_DEMO.md` sección "Cloudflare R2" (paso a paso ya escrito, no repetido aquí).

## SMTP (recuperación de contraseña)

Sin `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` configurados, el login y todo el resto del sistema funciona igual — solo el flujo de "olvidé mi contraseña" queda inactivo. `/health/ready` lo marca como `smtp: missing`, no rompe nada más.

El envío real de correos corre en un proceso aparte (`npm run start:email-worker`), porque usa una cola (BullMQ + Redis) para no bloquear el backend principal. Si configuras SMTP pero no despliegas el worker, los correos quedan encolados y nunca salen.

## "Dormir" por plan gratuito

Render y Railway en plan gratuito pueden pausar un servicio por inactividad (primera visita del día tarda más). Antes de compartir la demo con usuarios reales, decidir qué servicios pagar — ver la sección de presupuesto en `infra/DEPLOY_DEMO.md`.
