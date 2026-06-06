# Documentacion de avance 3 - Intranet Instituto

## Estado actual del proyecto

El proyecto completo:

```text
Paso 1 - Repositorio y entorno base: completado
Paso 2 - Base de datos con Prisma: completado
Paso 3 - Backend: Autenticacion: completado
```

Siguiente paso permitido segun la arquitectura:

```text
Paso 4 - Backend: Modulos de negocio
```

No se debe avanzar al frontend antes de implementar primero los modulos backend principales: cursos, examenes, materiales y calificaciones.

---

## Cambios realizados en el Paso 3

Se creo la estructura backend Express en:

```text
backend/src
```

Estructura agregada:

```text
backend/src/app.ts
backend/src/server.ts
backend/src/config/env.ts
backend/src/controllers/auth.controller.ts
backend/src/middleware/auth.middleware.ts
backend/src/middleware/error.middleware.ts
backend/src/middleware/require-role.middleware.ts
backend/src/routes/auth.routes.ts
backend/src/schemas/auth.schema.ts
backend/src/services/auth.service.ts
backend/src/types/auth.ts
backend/src/types/express.d.ts
backend/src/utils/http-error.ts
backend/src/utils/prisma.ts
```

Concepto para estudiar:

El controlador maneja HTTP, el servicio contiene la logica de negocio, el schema valida datos de entrada y el middleware protege rutas reutilizables.

---

## Dependencias agregadas

Dependencias principales:

```text
express 4.x
jsonwebtoken
bcrypt
zod 3.x
cors
helmet
cookie-parser
dotenv
```

Dependencias de tipos:

```text
@types/express 4.x
@types/jsonwebtoken
@types/cors
@types/cookie-parser
```

Nota:

`dotenv` se agrego porque Express/Node no cargan automaticamente `backend/.env`. Prisma CLI si lo carga, pero la aplicacion Node necesita cargarlo explicitamente.

---

## Endpoints implementados

```text
GET  /health
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

`POST /api/auth/login`:

```text
Recibe email y password.
Valida entrada con Zod.
Busca el usuario activo en PostgreSQL.
Compara password con bcrypt.
Genera JWT de 24 horas.
Devuelve token y datos publicos del usuario.
Guarda tambien el token en cookie HttpOnly auth_token.
```

`GET /api/auth/me`:

```text
Requiere JWT por Authorization: Bearer <token> o cookie auth_token.
Valida token.
Busca que el usuario siga activo en base de datos.
Devuelve los datos del usuario autenticado.
```

`POST /api/auth/logout`:

```text
Borra la cookie auth_token.
Devuelve confirmacion de cierre de sesion.
```

Nota:

El logout actual es stateless. Invalida la cookie en el cliente. Una lista negra de JWT con Redis no se implemento porque Redis pertenece a servicios posteriores de soporte y no esta exigido para cerrar el Paso 3.

---

## Seguridad implementada

```text
Helmet habilitado.
CORS restringido por FRONTEND_URL.
JSON body limitado a 1 MB.
JWT validado con JWT_SECRET.
Passwords comparados con bcrypt.
Errores internos no exponen detalles al usuario.
authMiddleware creado.
requireRole creado.
```

Regla importante:

`JWT_SECRET` debe tener al menos 32 caracteres. Si no cumple, el backend no arranca.

---

## Scripts disponibles actualizados

```json
"dev": "tsx watch src/server.ts",
"build": "tsc",
"start": "node dist/src/server.js",
"typecheck": "tsc --noEmit",
"prisma:validate": "prisma validate --schema prisma/schema.prisma"
```

---

## Validaciones realizadas

Desde:

```powershell
cd C:\intranet-instituto\backend
```

Se valido TypeScript:

```powershell
npm.cmd run typecheck
```

Resultado:

```text
OK
```

Se compilo el backend:

```powershell
npm.cmd run build
```

Resultado:

```text
OK
```

Se valido Prisma:

```powershell
npm.cmd run prisma:validate
```

Resultado:

```text
The schema at prisma\schema.prisma is valid
```

Se probaron endpoints reales con el usuario seed:

```text
GET /health -> ok
POST /api/auth/login -> admin@instituto.test, rol ADMIN, token JWT generado
GET /api/auth/me -> admin@instituto.test
POST /api/auth/logout -> Sesion cerrada
```

No se mostro el token completo para evitar exponer credenciales de sesion.

---

## Siguiente paso recomendado

Continuar con:

```text
Paso 4 - Backend: Modulos de negocio
```

Orden sugerido dentro del Paso 4:

```text
1. Modulo de Cursos
2. Modulo de Examenes
3. Modulo de Materiales
4. Modulo de Calificaciones
```

Antes de programar el Paso 4, comprobar:

```powershell
cd C:\intranet-instituto
git status --short
git branch --show-current
```

Resultado esperado:

```text
Solo cambios del Paso 3 pendientes de commit
dev
```
