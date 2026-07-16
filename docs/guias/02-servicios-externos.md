# Servicios externos: Railway, Cloudflare R2

Guía operativa detallada ya existente: `infra/DEPLOY_DEMO.md` (no duplicar secretos, solo referencia). Esta guía explica el "para qué" de cada servicio y dónde toca el código.

## Mapa general

```
Railway  → un solo proyecto con cuatro servicios: backend (Express), frontend (Next.js), PostgreSQL, Redis
Cloudflare R2 → archivos (materiales de curso, PDFs, etc.)
Cloudflare (registrador/DNS) → dominio propio, apunta al servicio frontend en Railway
SMTP (ej. Resend) → correos de recuperación de contraseña
```

Antes el frontend vivía en Render; se migró a Railway como segundo servicio del mismo proyecto. Si ves menciones a Render en documentación vieja o commits antiguos, ya no aplican.

## Railway — backend, frontend, PostgreSQL, Redis

Un solo proyecto Railway con cuatro servicios:

- **Backend**: Root Directory `backend`, build `npm ci && npm run build`, start `npm run start` (que corre `prisma migrate deploy` antes de arrancar — ver `backend/package.json`). Healthcheck en `/health`.
- **Frontend**: Root Directory `frontend`, build `npm ci && npm run build`, start `npm run start`.
- **PostgreSQL**: Railway te da un `DATABASE_URL` — cópialo tal cual a la variable `DATABASE_URL` del servicio backend.
- **Redis**: igual, Railway da un `REDIS_URL`.

El backend valida TODAS sus variables de entorno al arrancar con Zod (`backend/src/config/env.ts`). Si falta `JWT_SECRET` o está mal formado, el proceso no arranca — es intencional, mejor que fallar a medias.

Variables que se configuran en el dashboard de Railway (nunca en el repo): ver la lista completa en `infra/DEPLOY_DEMO.md`.

Endpoint para confirmar que todo está bien conectado tras un deploy: `GET /health/ready` — devuelve el estado de postgres, redis, r2, smtp y sentry por separado. Si un servicio no está configurado, aparece `"status":"missing"` (no es un error fatal, es informativo).

### Variables del servicio frontend

- `BACKEND_URL` — debe apuntar a la URL del backend. Como ambos servicios están en el mismo proyecto Railway, se puede usar el dominio privado interno (`http://<servicio-backend>.railway.internal:4000`, más rápido y sin salir a internet) o la URL pública del backend; cualquiera funciona.
- `NEXTAUTH_URL` — la URL pública del propio frontend (el dominio propio una vez conectado, o el `*.up.railway.app` mientras tanto).
- `NEXTAUTH_SECRET` — distinto del `JWT_SECRET` del backend (son secretos independientes, uno firma el JWT del backend, el otro cifra la cookie de sesión de NextAuth).

Si `BACKEND_URL` o `NEXTAUTH_URL` quedan mal puestos (ej. apuntando a `localhost` en producción), el login funciona pero las llamadas al backend fallan con error de conexión. Este fue justo el tipo de error encontrado y corregido en `frontend/.env` local durante la auditoría del 2026-07-01 (puertos de una prueba temporal que quedaron puestos) — ver [guía 5](./05-auditoria-y-pruebas.md).

### Variables del servicio backend a revisar cuando cambia el dominio del frontend

- `FRONTEND_URL` — se usa para el CORS (`backend/src/app.ts`) y para armar los links de los correos (reset de password, etc. — `backend/src/services/auth.service.ts`, `email.service.ts`). Si cambias el dominio público del frontend y no actualizas esta variable, los correos de recuperación siguen apuntando a la URL vieja.

## Dominio propio (Cloudflare) → servicio frontend en Railway

1. Railway → proyecto → servicio **frontend** → Settings → Networking → Custom Domain → agregar el dominio (ej. `tudominio.com`, y opcionalmente `www.tudominio.com`).
2. Railway muestra un registro CNAME para crear. Copiarlo.
3. En Cloudflare DNS: crear ese CNAME. Dejar el proxy en "DNS only" (nube gris) mientras Railway valida el dominio y emite el certificado SSL (Let's Encrypt automático).
4. Cuando Railway marca el dominio como activo/certificado emitido, se puede activar el proxy naranja de Cloudflare si se quiere su CDN/WAF — en ese caso poner el modo SSL/TLS de Cloudflare en "Full" (no "Flexible"), porque Railway ya sirve HTTPS.
5. Actualizar `NEXTAUTH_URL` (frontend) y `FRONTEND_URL` (backend) al nuevo dominio y redesplegar ambos servicios.
6. El backend no necesita dominio propio: el navegador nunca le habla directo (todo pasa por las API routes de Next.js, ver `frontend/src/lib/backend.ts`). Solo dale dominio propio si se quiere algo tipo `api.tudominio.com` por estética, no es funcionalmente necesario.
7. Validar: abrir el dominio nuevo, hacer login, revisar `GET /health/ready` del backend, y probar "olvidé mi contraseña" confirmando que el correo trae el link con el dominio nuevo.

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

Railway en plan gratuito puede pausar un servicio por inactividad (primera visita del día tarda más). Antes de compartir la demo con usuarios reales, confirmar que backend, frontend, PostgreSQL y Redis estén en un plan que no se duerma — ver `infra/DEPLOY_DEMO.md`.
