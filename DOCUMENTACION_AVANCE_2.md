# Documentacion de avance 2 - Intranet Instituto

## Proposito de este documento

Este documento resume el avance real del proyecto hasta el cierre del Paso 2 de la arquitectura oficial. Sirve para que el propietario del proyecto pueda estudiar lo construido y para que otra IA pueda continuar sin asumir informacion fuera de la arquitectura.

Fuente de verdad principal:

```text
C:\intranet-instituto\arquitectura_intranet_educativa.md
```

Carpeta correcta de trabajo:

```text
C:\intranet-instituto
```

No usar la carpeta de OneDrive para programar este proyecto.

---

## Estado actual del proyecto

El proyecto ya completo:

```text
Paso 1 - Repositorio y entorno base: completado
Paso 2 - Base de datos con Prisma: completado
```

Siguiente paso permitido segun la arquitectura:

```text
Paso 3 - Backend: Autenticacion
```

No se debe avanzar a frontend, cursos, examenes, materiales ni calificaciones antes de implementar autenticacion del backend.

---

## Estado de Git

Repositorio local:

```text
C:\intranet-instituto
```

Rama de trabajo:

```text
dev
```

Remoto:

```text
https://github.com/michaelquispehuari-arch/intranet-instituto.git
```

Commits actuales importantes:

```text
fe55fe6 chore: inicializar documentacion y entorno
b05f8c6 Configuracion de entorno Node 20 y PostgreSQL local
29010b6 chore: completar setup prisma y seed
```

El ultimo commit subido a GitHub al cerrar el Paso 2 fue:

```text
29010b6 chore: completar setup prisma y seed
```

Los commits posteriores de documentacion no cambian el estado tecnico del Paso 2; solo explican lo avanzado.

Antes de continuar, el estado esperado debe ser:

```powershell
git status --short
```

Resultado esperado:

```text

```

Es decir, sin archivos modificados pendientes.

---

## Paso 1 completado - Repositorio y entorno base

Se creo:

```text
.env.example
.gitignore
```

El archivo `.env.example` de la raiz documenta variables generales de entorno sin secretos reales.

El archivo `.gitignore` evita subir:

```text
node_modules/
.env
.env.*
.next/
dist/
build/
coverage/
logs
archivos temporales
```

Regla importante:

```text
Los archivos .env reales nunca deben subirse a GitHub.
```

Concepto para estudiar:

`.env.example` se versiona porque ensena que variables necesita el proyecto. `.env` no se versiona porque contiene credenciales reales o valores privados.

---

## Paso 2 completado - Base de datos con Prisma

Se creo la carpeta:

```text
backend
```

Estructura relevante actual:

```text
backend/
  .env
  .env.example
  package.json
  package-lock.json
  tsconfig.json
  prisma/
    schema.prisma
    seed.ts
    migrations/
      20260606015923_init/
        migration.sql
      migration_lock.toml
```

El archivo `backend/.env` existe solo de forma local y no debe subirse. Contiene como minimo las variables necesarias para desarrollo.

El archivo `backend/.env.example` si se sube y contiene nombres de variables y valores de ejemplo.

---

## Versiones y dependencias del backend

Version de Node usada:

```text
Node.js 20 LTS
```

Dependencias principales instaladas en `backend/package.json`:

```text
@prisma/client
bcrypt
```

Dependencias de desarrollo:

```text
prisma
tsx
typescript
@types/bcrypt
@types/node
```

Scripts disponibles:

```json
"prisma:generate": "prisma generate",
"prisma:validate": "prisma validate --schema prisma/schema.prisma",
"prisma:migrate": "prisma migrate dev",
"prisma:seed": "prisma db seed",
"typecheck": "tsc --noEmit"
```

El comando de seed usa:

```json
"seed": "node --import tsx prisma/seed.ts"
```

Esto se eligio porque en Windows el comando directo `tsx prisma/seed.ts` puede no ser reconocido por Prisma.

---

## Base de datos configurada

Motor de base de datos:

```text
PostgreSQL
```

ORM:

```text
Prisma
```

Archivo principal del esquema:

```text
backend/prisma/schema.prisma
```

Migracion inicial:

```text
backend/prisma/migrations/20260606015923_init/migration.sql
```

Estado verificado:

```text
Database schema is up to date
```

Concepto para estudiar:

Prisma usa `schema.prisma` como definicion del modelo de datos. La migracion convierte ese modelo en tablas reales dentro de PostgreSQL.

---

## Modelos creados en Prisma

El esquema implementa los modelos definidos por la arquitectura:

```text
Usuario
Curso
Inscripcion
Examen
Pregunta
ExamenEnvio
RespuestaEstudiante
Material
NotaManual
Asistencia
ConfigCurso
```

Enums creados:

```text
Rol
TipoPregunta
EstadoAsistencia
```

Roles del sistema:

```text
ADMIN
PROFESOR
ESTUDIANTE
```

Reglas importantes ya reflejadas en base de datos:

```text
Usuario.email es unico
Inscripcion tiene estudianteId + cursoId unico
ExamenEnvio tiene estudianteId + examenId unico
Asistencia tiene estudianteId + cursoId + fecha unico
ConfigCurso tiene un cursoId unico
```

Concepto para estudiar:

Los indices `@@unique` protegen reglas de negocio desde la base de datos. Por ejemplo, un estudiante no debe tener dos envios para el mismo examen.

---

## Seed de datos de prueba

Archivo:

```text
backend/prisma/seed.ts
```

El seed crea:

```text
1 admin
2 profesores
10 estudiantes
2 cursos
1 examen de ejemplo
```

Usuarios de prueba:

```text
admin@instituto.test
profesor.matematica@instituto.test
profesor.comunicacion@instituto.test
estudiante1@instituto.test
...
estudiante10@instituto.test
```

Contrasena de prueba:

```text
Password123!
```

Importante:

La contrasena no se guarda como texto plano. El seed usa:

```text
bcrypt.hash("Password123!", 12)
```

Esto cumple la arquitectura y la regla legal/seguridad de guardar contrasenas como hash.

Concepto para estudiar:

Aunque sean datos de prueba, se usa el mismo patron seguro que se usara en produccion. Eso evita acostumbrar el codigo a practicas inseguras.

---

## Validaciones realizadas al cerrar el Paso 2

Desde:

```powershell
cd C:\intranet-instituto\backend
```

Se valido TypeScript:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Resultado:

```text
OK
```

Se valido Prisma:

```powershell
.\node_modules\.bin\prisma.cmd validate --schema prisma/schema.prisma
```

Resultado:

```text
The schema at prisma\schema.prisma is valid
```

Se genero Prisma Client:

```powershell
.\node_modules\.bin\prisma.cmd generate
```

Resultado:

```text
Generated Prisma Client
```

Se reviso el estado de migraciones:

```powershell
.\node_modules\.bin\prisma.cmd migrate status
```

Resultado:

```text
Database schema is up to date
```

Se ejecuto el seed:

```powershell
.\node_modules\.bin\prisma.cmd db seed
```

Resultado:

```text
The seed command has been executed.
```

---

## Permisos y problemas encontrados

### PowerShell y npm

En Windows, `npm` puede fallar por politicas de ejecucion de PowerShell con `npm.ps1`.

Solucion usada:

```powershell
npm.cmd install
```

### Sandbox y Prisma

Algunas validaciones de Prisma pueden requerir permiso adicional porque intentan resolver rutas temporales bajo:

```text
C:\Users\micha
```

Si Codex pide permiso para ejecutar Prisma con acceso elevado, es esperado en este entorno.

### Autenticacion de GitHub

GitHub rechazo inicialmente el push porque Windows tenia guardada otra cuenta.

Solucion aplicada:

```text
Se borro la credencial HTTPS antigua de github.com con Git Credential Manager.
Luego se inicio sesion con la cuenta correcta.
```

Concepto para estudiar:

`git config user.name` y `git config user.email` definen el autor del commit. La cuenta que puede hacer `push` depende de la credencial guardada por Windows/Git Credential Manager.

---

## Variables de entorno

Variables documentadas en `backend/.env.example`:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
NEXTAUTH_SECRET
FRONTEND_URL
NODE_ENV
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
SMTP_HOST
SMTP_USER
SMTP_PASS
SENTRY_DSN
```

`backend/.env` contiene valores locales. No debe mostrarse completo en respuestas ni subirse a Git.

---

## Que no se ha implementado todavia

Todavia no existe backend Express.

Todavia no existen:

```text
backend/src/routes
backend/src/controllers
backend/src/services
backend/src/middleware
backend/src/utils
backend/src/queues
backend/tests
```

Todavia no se implemento:

```text
Login
Logout
GET /api/auth/me
JWT
authMiddleware
requireRole
Zod
CORS
Helmet
Redis
Bull Queue
Cloudflare R2
Frontend Next.js
```

Esto es correcto porque esos puntos pertenecen al Paso 3 o pasos posteriores.

---

## Siguiente paso correcto

El siguiente paso debe ser:

```text
Paso 3 - Backend: Autenticacion
```

Segun la arquitectura, debe incluir:

```text
Express 4
TypeScript
jsonwebtoken
bcrypt
zod
cors
helmet
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
authMiddleware
requireRole
```

Antes de programar el Paso 3, la IA debe comprobar:

```powershell
cd C:\intranet-instituto
git status --short
git branch --show-current
node --version
```

Resultados esperados:

```text
sin cambios pendientes
dev
v20.x
```

Luego debe leer:

```text
arquitectura_intranet_educativa.md
DOCUMENTACION_AVANCE_1.md
DOCUMENTACION_AVANCE_2.md
```

---

## Reglas para cualquier IA que continue

1. No usar carpetas fuera de `C:\intranet-instituto`.
2. No asumir detalles que no esten en la arquitectura.
3. No avanzar al frontend antes de cerrar autenticacion del backend.
4. No subir ningun archivo `.env`.
5. No guardar contrasenas en texto plano.
6. Mantener Node 20 LTS.
7. Validar TypeScript y Prisma antes de cada commit importante.
8. Si falta una decision tecnica, advertirlo antes de implementar.
9. Mantener commits pequenos y claros.
10. Trabajar siempre desde la rama `dev` hasta que exista una politica formal de merge a `main`.

---

## Resumen de aprendizaje

Hasta este punto se preparo la base tecnica del sistema. Prisma define las tablas, PostgreSQL guarda los datos reales, y el seed permite probar el sistema con usuarios y cursos iniciales.

La idea importante es que una arquitectura se construye por capas: primero entorno y base de datos, luego autenticacion, luego modulos de negocio, y recien despues frontend y servicios externos.
