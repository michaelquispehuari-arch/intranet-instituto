# Partes del proyecto — dónde modificar qué

## Estructura general

```
intranet-instituto/
├── backend/            Express + TypeScript + Prisma + PostgreSQL (puerto 4000)
├── frontend/           Next.js App Router (puerto 3000)
├── infra/              Notas de despliegue (nginx, Railway)
├── docker-compose.yml  Redis local (ver guía 07-desarrollo-local.md; Postgres corre en un contenedor aparte)
└── docs/guias/         Esta carpeta
```

El frontend NUNCA llama directo al backend desde el navegador. Todo pasa por:
`Navegador → páginas/proxies de Next.js (server-side) → Express (backend) → PostgreSQL / Redis / R2`

Esto es intencional (seguridad: el token de sesión del backend no debe llegar al navegador). No lo cambies sin entender el flujo completo en `frontend/src/lib/auth.ts` y `frontend/src/lib/backend.ts`.

---

## Frontend (`frontend/src`)

### Textos de cada pantalla

Los textos están escritos directo en el JSX de cada `page.tsx`, no hay archivo de traducciones. Para cambiar un texto, busca la pantalla y edita el string directamente.

- Pantallas con menú lateral (la mayoría): `frontend/src/app/(app)/<nombre>/page.tsx`
  - `inicio`, `cursos`, `cursos/[id]`, `cursos/[id]/notas`, `cursos/[id]/sesiones/[sesionId]`, `exams`, `calificaciones`, `estudiantes`, `profesores`, `sustitutorios`, `configuracion`, `material`, `material/subir`
- Pantallas sin menú (login, recuperar contraseña): `frontend/src/app/login/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `privacy/page.tsx`
- El nombre "PeRTS" y el eslogan del panel están en `frontend/src/components/app-shell.tsx` y en `frontend/src/app/layout.tsx` (metadata del `<head>`).

### Imágenes / logo / mascota

Todos los assets de marca están en `frontend/public/brand/`:
- `logo-perts.png` — logo, usado en `app-shell.tsx` (marca de agua del panel) y en el login.
- `flag-mascot.png` / `flag-mascot-trimmed.png` — la mascota "R" del panel lateral.
- `login-bg.svg`, `texture-paper.png` — fondos.

Para cambiar una imagen: reemplaza el archivo (mismo nombre) o cambia la ruta en el componente `<Image src="/brand/..." />` que la usa. Los tamaños (`width`/`height`) están hardcodeados en cada `<Image>`, ajústalos si cambias las proporciones.

### Menú lateral (opciones de navegación)

Un solo archivo controla qué aparece en el menú y para qué rol: `frontend/src/components/app-shell.tsx`, array `navItems` (línea ~24). Cada item:

```ts
{ href: "/cursos", label: "Cursos", labelByRole: { PROFESOR: "Mi curso" }, Icon: BookOpen, roles: ["ADMIN","PROFESOR","ESTUDIANTE"] }
```

Para agregar una opción nueva al menú: agrega un objeto aquí. Para que además esté protegida por rol a nivel de ruta (no solo oculta visualmente), agrega también la ruta en `frontend/middleware.ts` (objeto `roleAccess` + array `matcher`).

**Importante:** `/material` no está en el menú a propósito — se entra desde dentro de cada curso, no desde el menú global. No es un error.

### Estilos / colores

- `frontend/src/app/tokens.css` — variables de color, tamaños (`--sidebar-w`, `--verde-sidebar`, etc.).
- `frontend/src/app/base.css` — estilos base compartidos.
- `frontend/src/app/globals.css` — importa los dos anteriores + estilos específicos por pantalla.

### Cómo conectar una pantalla nueva al backend

Dos patrones, según si la pantalla necesita interactividad (tabs, formularios) o no:

1. **Server component (sin `useSession`)**: usa `getServerSession(authOptions)` + `backendGet/backendPost` de `frontend/src/lib/backend.ts` directo en el `page.tsx`. Ver `frontend/src/app/(app)/cursos/page.tsx` como ejemplo.
2. **Client component (con tabs/forms, `"use client"`)**: usa `useSession()` de `next-auth/react` y llama a un proxy en `frontend/src/app/api/backend/<recurso>/route.ts`, que internamente sí usa `getServerSession` + `backendGet/backendPost`. Agrega `export const dynamic = "force-dynamic";` en la página si usa `useSession`, o falla el build (prerender error).

Todo proxy nuevo en `api/backend/*` debe apuntar a una ruta que exista de verdad en `backend/src/app.ts`. Si la pantalla llama a un proxy que no existe, o el proxy llama a una ruta backend que no existe, la pantalla se rompe en silencio (error 404 al primer fetch).

---

## Backend (`backend/src`)

```
config/       env.ts (variables de entorno validadas con Zod), sentry.ts
routes/       un archivo por recurso, registra los endpoints Express
controllers/  recibe el request, valida con Zod, llama al service
services/     lógica de negocio (acceso a Prisma, reglas de notas, etc.)
middleware/   auth (JWT), require-role (permisos), rate-limit, upload, errores
schemas/      validaciones Zod de body/params/query
utils/        prisma client, redis, r2 (Cloudflare), mailer, jwt
queues/       cola de emails (BullMQ)
workers/      proceso separado que envía los emails de la cola
```

Para agregar un endpoint nuevo: ruta en `routes/`, función en `controllers/`, lógica en `services/`, validación en `schemas/`. Sigue el patrón de un recurso existente (ej. `session.routes.ts` + `session.controller.ts` + `session.service.ts`).

### Roles y permisos

Doble capa, ambas necesarias:
- **Backend** (la que realmente protege los datos): `middleware/auth.middleware.ts` (verifica el JWT) + `middleware/require-role.middleware.ts` (verifica el rol) en cada ruta.
- **Frontend** (`middleware.ts`, solo evita que alguien vea una pantalla que no le corresponde — no protege datos, eso ya lo hace el backend).

### Base de datos

`backend/prisma/schema.prisma` define las tablas. Cualquier cambio de estructura va en un archivo nuevo dentro de `backend/prisma/migrations/`. Ver [guía de base de datos](./03-base-de-datos-railway.md).

---

## Variables de entorno (conexiones)

| Archivo | Para qué |
|---|---|
| `backend/.env` | DB, Redis, JWT, R2, SMTP — local, nunca se sube a git |
| `frontend/.env` | `BACKEND_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — local |
| `backend/.env.example`, `frontend/.env.example` | plantilla sin secretos, sí se sube a git |

En producción (Railway) estas variables se configuran en el dashboard, servicio por servicio (backend y frontend son dos servicios distintos dentro del mismo proyecto Railway), nunca en un archivo del repo. Ver [servicios externos](./02-servicios-externos.md).
