# Despliegue demo sin dominio propio

## Objetivo

Mantener la demo publica usando:

```text
Frontend: Render
Backend: Railway
PostgreSQL: Railway
Archivos: Cloudflare R2
Redis: pendiente por proveedor
SMTP: pendiente por proveedor
```

No escribir secretos reales en este archivo.

---

## Estado recomendado antes de compartir la demo

```text
GET /health                         -> 200
GET /health/ready                   -> ready o degraded con detalle entendido
Login ADMIN                         -> OK
Login PROFESOR                      -> OK
Login ESTUDIANTE                    -> OK
Crear/publicar/rendir examen        -> OK
Subir/descargar/eliminar material   -> OK cuando R2 este configurado
Reset de password                   -> OK cuando Redis + SMTP + worker esten configurados
```

---

## Railway - backend

Servicio actual:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm run start
Healthcheck Path: /health
```

Variables necesarias:

```text
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://intranet-instituto-frontend.onrender.com
DATABASE_URL=<Railway PostgreSQL DATABASE_PUBLIC_URL o URL valida>
JWT_SECRET=<secreto largo>
REDIS_URL=<redis real>
CLOUDFLARE_R2_ACCOUNT_ID=<account id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<access key id>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret access key>
CLOUDFLARE_R2_BUCKET_NAME=<bucket>
SMTP_HOST=<host smtp>
SMTP_PORT=587
SMTP_USER=<usuario smtp>
SMTP_PASS=<password smtp>
SMTP_FROM=<correo remitente autorizado>
SENTRY_DSN=<opcional>
```

Despues de cambiar variables:

```text
1. Redeploy del backend.
2. Abrir /health.
3. Abrir /health/ready.
4. Revisar /settings como ADMIN.
```

---

## Render - frontend

Servicio actual:

```text
Root Directory: frontend
Build Command: npm ci && npm run build
Start Command: npm run start
```

Variables necesarias:

```text
BACKEND_URL=https://intranet-instituto-production.up.railway.app
NEXTAUTH_URL=https://intranet-instituto-frontend.onrender.com
NEXTAUTH_SECRET=<secreto largo diferente a JWT_SECRET>
```

Si cambia la URL del backend, actualizar `BACKEND_URL` y redeploy.

---

## Cloudflare R2

Uso en este proyecto:

```text
Guardar materiales educativos privados.
PostgreSQL guarda solo la clave del objeto.
El backend genera URL firmada temporal para descargar.
El bucket NO debe ser publico.
```

Pasos:

```text
1. Entrar a Cloudflare Dashboard.
2. Ir a Storage & databases > R2.
3. Crear o activar R2 si la cuenta aun no lo hizo.
4. Crear un bucket, por ejemplo: intranet-instituto-materiales.
5. En R2, ir a Account Details > API Tokens.
6. Crear token con Object Read & Write.
7. Si Cloudflare permite limitar por bucket, limitarlo al bucket de materiales.
8. Copiar Access Key ID y Secret Access Key solo una vez.
9. Copiar Account ID.
10. Pegar esos datos en Railway, no en Git ni en chats.
```

Variables Railway:

```text
CLOUDFLARE_R2_ACCOUNT_ID=<account id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<access key id>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<secret access key>
CLOUDFLARE_R2_BUCKET_NAME=intranet-instituto-materiales
```

Validacion:

```text
1. Redeploy backend.
2. /health/ready debe mostrar r2: ok.
3. Subir un PDF pequeno desde /content/upload con usuario PROFESOR.
4. Descargarlo desde /content con usuario ESTUDIANTE inscrito.
```

---

## SMTP y reset de password

Para que recuperacion de contrasena funcione faltan tres piezas juntas:

```text
Redis real
SMTP real
email-worker desplegado
```

Con Resend, las variables SMTP esperadas son:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<api key de Resend>
SMTP_FROM=<correo de dominio verificado>
```

Sin dominio propio, el correo real puede quedar limitado por el proveedor SMTP. Para demo se puede dejar reset de password pendiente y validar el resto de modulos primero.

---

## Email worker

El worker debe correr como servicio separado porque procesa la cola BullMQ.

Servicio sugerido:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm run start:email-worker
```

Debe usar las mismas variables que el backend para:

```text
REDIS_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
SENTRY_DSN
```

Validacion:

```text
1. Backend /health/ready muestra redis: ok y smtp: ok.
2. Worker inicia sin errores.
3. Solicitar reset desde /forgot-password.
4. Confirmar llegada del correo.
5. Cambiar password desde /reset-password?token=...
```

---

## Sobre "despertar" servicios

Mientras se use plan gratuito, alguna plataforma puede dormir servicios por inactividad.

Para estudiantes reales, se debe pagar al menos el servicio que recibe trafico publico:

```text
Frontend Render: evita espera inicial del sitio.
Backend Railway: evita espera inicial de la API.
Worker: necesario si se quiere reset de password por correo siempre disponible.
```

La decision final de pago debe tomarse despues de validar todo el flujo demo.
