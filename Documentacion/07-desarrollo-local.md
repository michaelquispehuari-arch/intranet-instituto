# Desarrollo local (Postgres + Redis con Docker)

> **Contiene:** cómo levantar Postgres/Redis con Docker y correr backend + frontend en tu PC. Punto de partida obligatorio antes de escribir código — todo cambio se prueba aquí antes de subir a `main`.

Desde el 2026-07-23, `main` es la única rama que Railway despliega (ver [guía de git](./04-git-guia.md)). Todo cambio se prueba primero aquí, en local, antes de mergear `dev` → `main`.

## Requisitos

- Docker Desktop instalado y abierto.
- `backend/.env` y `frontend/.env` ya configurados apuntando a `localhost` (si no existen, copia `backend/.env.example` y `frontend/.env.example` y ajusta según haga falta — los valores de Cloudflare R2/SMTP pueden quedar vacíos, solo desactivan esas funciones en local, no rompen nada más).

## Levantar Postgres y Redis

```bash
docker compose up -d
```

`docker-compose.yml` (raíz del repo) levanta Redis. Postgres corre en un contenedor aparte llamado `intranet-postgres` (creado manualmente, no por este compose) — si no existe en tu máquina, créalo una vez:

```bash
docker run -d --name intranet-postgres -p 5432:5432 \
  -e POSTGRES_USER=intranet_user \
  -e POSTGRES_PASSWORD=intranet_pass_dev \
  -e POSTGRES_DB=intranet_instituto \
  -v intranet_postgres_data:/var/lib/postgresql/data \
  postgres:16
```

En los siguientes días, si el contenedor ya existe pero está apagado: `docker start intranet-postgres`.

## Backend

```bash
cd backend
npm install
npm run prisma:migrate     # aplica migraciones pendientes a tu DB local
npm run prisma:seed        # crea 1 admin, 2 profesores, 10 estudiantes, 2 cursos (password: Password123!)
npm run dev                # http://localhost:4000
```

Si `npm run prisma:migrate` (que usa una base "shadow" para validar) falla con un error raro que no tiene sentido con el SQL de la migración, usa `npx prisma db push --schema prisma/schema.prisma` como alternativa — sincroniza el schema directo sin pasar por la shadow db. Es una salida válida porque esta es tu base local, sin historial que compartir con nadie más.

Verifica que levantó bien: `curl http://localhost:4000/health/ready` debe mostrar `postgres: ok` y `redis: ok` (r2/smtp/sentry pueden salir `missing`, no es un error si no los configuraste local).

## Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:3000
```

Entra a `http://localhost:3000/login` con `admin@instituto.test` / `Password123!` (o cualquier usuario del seed) para confirmar que el login funciona de punta a punta.

## Flujo completo de un cambio

1. Trabajar en `dev`, probar acá en local.
2. `npm run typecheck` y `npm run build` (backend y frontend) antes de subir.
3. `git push` a `dev` (no toca producción).
4. Cuando esté validado: merge a `main` y push — ahí sí redespliega Railway (ver [guía de git](./04-git-guia.md)).
