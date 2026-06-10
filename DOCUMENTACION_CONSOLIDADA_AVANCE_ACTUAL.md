# Documentacion consolidada del avance actual - Intranet Instituto

## Proposito

Este documento consolida las documentaciones de avance 1 a 6 y agrega el estado real actual del proyecto. Sirve para que el propietario pueda estudiar lo construido y para que otra IA pueda continuar sin asumir informacion fuera del proyecto.

Fuente de verdad de arquitectura:

```text
C:\intranet-instituto\arquitectura_intranet_educativa.md
```

Carpeta correcta de trabajo:

```text
C:\intranet-instituto
```

No usar carpetas de OneDrive para programar este proyecto.

---

## Estado general segun la arquitectura

Estado actual por pasos:

```text
Paso 1 - Repositorio y entorno base: completado
Paso 2 - Base de datos con Prisma: completado
Paso 3 - Backend: Autenticacion: completado
Paso 4 - Backend: Modulos de negocio: completado a nivel de codigo
Paso 5 - Frontend: avanzado con modulos principales conectados
Paso 6 - Servicios de soporte: iniciado con Sentry opcional, Redis, cola de email y reset de password
Paso 7 - Cloudflare y Nginx: iniciado con plantilla Nginx versionada
Paso 8 - CI/CD y backups: iniciado con workflow CI versionado
Paso 9 - Lanzamiento: demo publico iniciado con Railway + Render
Paso 10 - Post-lanzamiento: pendiente
```

Resumen tecnico actual:

```text
Backend Express + TypeScript + Prisma implementado.
Base PostgreSQL modelada con Prisma.
Autenticacion con JWT, bcrypt, cookie HttpOnly y middleware de roles.
Modulos backend implementados: cursos, examenes, materiales y calificaciones.
Modulo backend administrativo de usuarios implementado.
Frontend Next.js conectado a cursos, examenes, materiales, calificaciones, usuarios y configuracion.
Sentry backend agregado de forma opcional.
Reset de password agregado con Redis, BullMQ y email SMTP.
Politica de privacidad publica agregada.
Plantilla Nginx y workflow CI agregados.
Pruebas de integracion agregadas para calificaciones.
```

---

## Estado de Git y repositorio

Repositorio local:

```text
C:\intranet-instituto
```

Rama de trabajo:

```text
dev
```

Remoto GitHub:

```text
https://github.com/michaelquispehuari-arch/intranet-instituto.git
```

Autor local configurado:

```text
user.name  = Michael Bryan
user.email = michael.quispehuari@gmail.com
```

Commits historicos importantes al cierre del Paso 2:

```text
fe55fe6 chore: inicializar documentacion y entorno
b05f8c6 Configuracion de entorno Node 20 y PostgreSQL local
29010b6 chore: completar setup prisma y seed
```

Estado actual importante:

```text
Hay cambios locales pendientes de commit.
Hay archivos nuevos de calificaciones, usuarios, pruebas, Sentry y frontend.
No se debe hacer reset ni descartar cambios sin autorizacion.
```

---

## Paso 1 - Repositorio y entorno base

Objetivo de arquitectura:

```text
Crear repositorio, ramas, .gitignore y .env.example.
```

Resultado:

```text
Repositorio Git creado en C:\intranet-instituto.
Rama dev usada como rama de desarrollo.
Remoto GitHub configurado.
.gitignore creado.
.env.example raiz creado.
```

Reglas aplicadas:

```text
No subir archivos .env reales.
No subir node_modules.
No subir builds: dist, build, .next, out.
No subir caches temporales.
No subir *.tsbuildinfo.
```

Por que se hizo:

```text
.env.example se versiona porque documenta variables necesarias sin secretos.
.env no se versiona porque contiene credenciales reales o valores privados.
El proyecto se movio fuera de OneDrive para evitar bloqueos y conflictos con node_modules.
```

---

## Paso 2 - Base de datos con Prisma

Objetivo de arquitectura:

```text
Crear backend, configurar Prisma, escribir schema completo, migrar PostgreSQL y crear seed.
```

Estructura creada:

```text
backend/
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

Motor de base de datos:

```text
PostgreSQL
```

ORM:

```text
Prisma
```

Modelos implementados:

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

Enums implementados:

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

Reglas de integridad importantes:

```text
Usuario.email es unico.
Inscripcion tiene estudianteId + cursoId unico.
ExamenEnvio tiene estudianteId + examenId unico.
Asistencia tiene estudianteId + cursoId + fecha unico.
ConfigCurso tiene cursoId unico.
```

Por que se hizo:

```text
Prisma define la estructura logica de datos en schema.prisma.
Las migraciones convierten ese schema en tablas reales de PostgreSQL.
Los indices unique protegen reglas de negocio desde la base de datos, no solo desde el codigo.
```

---

## Seed y credenciales de prueba

Archivo:

```text
backend/prisma/seed.ts
```

El seed crea:

```text
1 administrador
2 profesores
10 estudiantes
2 cursos
1 examen de ejemplo
inscripciones de prueba
```

Contrasena comun de todos los usuarios seed:

```text
Password123!
```

Usuarios de prueba:

```text
admin@instituto.test
profesor.matematica@instituto.test
profesor.comunicacion@instituto.test
estudiante1@instituto.test
estudiante2@instituto.test
estudiante3@instituto.test
estudiante4@instituto.test
estudiante5@instituto.test
estudiante6@instituto.test
estudiante7@instituto.test
estudiante8@instituto.test
estudiante9@instituto.test
estudiante10@instituto.test
```

Cursos seed:

```text
curso-matematica-basica-2026
curso-comunicacion-2026
```

Examen seed:

```text
examen-matematica-diagnostico
```

Regla de seguridad:

```text
La contrasena Password123! no se guarda como texto plano.
El seed usa bcrypt.hash("Password123!", 12).
```

---

## Paso 3 - Backend: Autenticacion

Objetivo de arquitectura:

```text
Crear backend Express con autenticacion, JWT, bcrypt, validacion y middleware de roles.
```

Archivos principales:

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

Endpoints:

```text
GET  /health
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Flujo de login:

```text
1. Recibe email y password.
2. Valida entrada con Zod.
3. Busca usuario activo en PostgreSQL.
4. Compara password con bcrypt.compare.
5. Genera JWT por 24 horas.
6. Devuelve token y usuario publico.
7. Tambien guarda token en cookie HttpOnly auth_token.
```

Seguridad aplicada:

```text
Helmet habilitado.
CORS restringido por FRONTEND_URL.
JSON body limitado a 1 MB.
JWT validado con JWT_SECRET.
JWT_SECRET debe tener al menos 32 caracteres.
Passwords comparados con bcrypt.
Errores internos no exponen detalles.
authMiddleware protege rutas privadas.
requireRole protege rutas por rol.
```

Por que se hizo:

```text
El controlador maneja HTTP.
El servicio contiene la logica de negocio.
El schema Zod valida datos antes de usarlos.
El middleware reutiliza autenticacion y roles en todas las rutas.
```

Decision importante:

```text
El logout actual es stateless: borra la cookie del cliente.
No hay blacklist de JWT con Redis todavia porque Redis pertenece a servicios de soporte posteriores.
```

---

## Paso 4 - Backend: Modulo de Cursos

Archivos:

```text
backend/src/controllers/course.controller.ts
backend/src/routes/course.routes.ts
backend/src/schemas/course.schema.ts
backend/src/services/course.service.ts
```

Endpoints:

```text
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses
PATCH  /api/courses/:id
POST   /api/courses/:id/enrollments
DELETE /api/courses/:id/enrollments/:studentId
DELETE /api/courses/:id
```

Permisos:

```text
ADMIN:
  Lista todos los cursos.
  Ve cualquier curso.
  Crea cursos.
  Edita cursos.
  Matricula estudiantes.
  Retira estudiantes.
  Desactiva cursos.

PROFESOR:
  Lista sus cursos activos.
  Ve solo sus cursos activos.
  No crea, edita ni desactiva cursos.

ESTUDIANTE:
  Lista cursos activos donde esta inscrito.
  Ve solo cursos activos donde esta inscrito.
  No crea, edita ni desactiva cursos.
```

Decision importante:

```text
DELETE /api/courses/:id no borra fisicamente.
Hace borrado logico con activo = false.
```

Por que se hizo:

```text
El borrado logico evita perder historial relacionado con examenes, materiales, notas e inscripciones.
Las inscripciones se protegen tambien desde base de datos con estudianteId + cursoId unico.
```

---

## Paso 4 - Backend: Modulo de Examenes

Archivos:

```text
backend/src/controllers/exam.controller.ts
backend/src/routes/exam.routes.ts
backend/src/schemas/exam.schema.ts
backend/src/services/exam.service.ts
```

Endpoints:

```text
GET   /api/exams
GET   /api/exams/:id
GET   /api/exams/:id/results
POST  /api/exams
PATCH /api/exams/:id/publish
POST  /api/exams/:id/submit
```

Permisos:

```text
ADMIN:
  Lista todos los examenes.
  Ve cualquier examen con respuestas correctas.

PROFESOR:
  Lista examenes de sus cursos.
  Crea examenes solo en sus cursos activos.
  Publica examenes solo de sus cursos.
  Ve sus examenes con respuestas correctas.
  Ve resultados de examenes de sus cursos.

ESTUDIANTE:
  Lista examenes publicados de cursos donde esta inscrito.
  Ve examen disponible sin respuestaCorrecta.
  Envia respuestas solo una vez por examen.
  Ve solo su propio resultado.
```

Regla critica:

```text
El estudiante nunca envia puntaje.
El backend recalcula el puntaje usando preguntas y respuestas almacenadas.
```

Idempotencia:

```text
POST /api/exams/:id/submit verifica si ya existe ExamenEnvio para estudianteId + examenId.
Si el envio ya existe y esta completado, devuelve el resultado guardado sin duplicar.
```

Por que se hizo:

```text
Evita doble procesamiento si el estudiante hace clic varias veces o reintenta la peticion.
Impide manipular notas desde el frontend.
```

---

## Paso 4 - Backend: Modulo de Materiales

Ruta base:

```text
/api/content
```

Archivos:

```text
backend/src/controllers/content.controller.ts
backend/src/routes/content.routes.ts
backend/src/schemas/content.schema.ts
backend/src/services/content.service.ts
backend/src/middleware/upload.middleware.ts
backend/src/utils/r2.ts
```

Endpoints:

```text
GET    /api/content
GET    /api/content/:id
POST   /api/content
GET    /api/content/:id/download
DELETE /api/content/:id
```

POST /api/content recibe:

```text
multipart/form-data
campo file
campo cursoId
campo nombre opcional
campo descripcion opcional
```

Permisos:

```text
ADMIN:
  Lista y ve cualquier material.
  Elimina materiales.

PROFESOR:
  Lista materiales de sus cursos.
  Sube materiales solo a sus cursos activos.
  Genera descarga de sus materiales.
  Elimina sus materiales.

ESTUDIANTE:
  Lista y descarga materiales solo de cursos donde esta inscrito.
```

Integracion R2:

```text
Se usa cliente S3 compatible con Cloudflare R2.
PostgreSQL guarda Material.urlR2 como clave privada del objeto, no URL publica.
La descarga genera URL firmada temporal de 15 minutos.
```

Tipos permitidos:

```text
pdf
mp4
mp3
docx
pptx
xlsx
jpg
jpeg
png
```

Tamano maximo:

```text
500 MB
```

Decision tecnica reciente:

```text
content.service.ts y r2.ts usan imports dinamicos y singleton getR2Client().
```

Por que se hizo:

```text
El cliente R2 se crea solo cuando se necesita subir, descargar o eliminar archivos.
Esto reduce carga inicial y mantiene aislada la dependencia AWS SDK dentro de operaciones de contenido.
```

Pendiente real:

```text
No se ha probado subida real a R2 porque faltan credenciales reales de Cloudflare R2.
```

---

## Paso 4 - Backend: Modulo de Calificaciones

Estado:

```text
Implementado a nivel de codigo y probado con integracion.
```

Archivos:

```text
backend/src/controllers/grade.controller.ts
backend/src/routes/grade.routes.ts
backend/src/schemas/grade.schema.ts
backend/src/services/grade.service.ts
backend/tests/integration/grades.test.ts
```

Ruta base:

```text
/api/grades
```

Endpoints:

```text
GET    /api/grades
GET    /api/grades/config/:cursoId
PATCH  /api/grades/config/:cursoId
POST   /api/grades/manual
PATCH  /api/grades/manual/:id
DELETE /api/grades/manual/:id
GET    /api/grades/attendance
POST   /api/grades/attendance
```

Permisos:

```text
ADMIN:
  Puede ver resumenes.
  Puede ver y editar configuracion de calificacion por curso.

PROFESOR:
  Puede ver resumenes de sus cursos.
  Puede crear, editar y eliminar notas manuales de sus cursos.
  Puede registrar asistencia de sus cursos.

ESTUDIANTE:
  Puede ver solo sus propias calificaciones.
  Puede ver solo su propia asistencia.
  No puede crear notas ni asistencia.
  No puede configurar pesos.
```

Calculo de promedio:

```text
promedioExamenes = promedio de examenes completados convertido a escala 0-20.
promedioNotasManuales = promedio de NotaManual.valor.
promedioFinal = promedioExamenes * pesoExamenes + promedioNotasManuales * pesoNotasManuales.
notaAprobatoria por defecto = 11.
pesos por defecto = 0.7 examenes y 0.3 notas manuales.
```

Regla agregada:

```text
pesoExamenes + pesoNotasManuales debe sumar 1.
Si no suma 1, el backend responde 400.
```

Correccion de seguridad aplicada:

```text
Si un ESTUDIANTE manda estudianteId por query intentando consultar a otro estudiante,
el backend ignora ese estudianteId y usa siempre el user.id autenticado.
```

Por que se hizo:

```text
La arquitectura exige que el estudiante solo vea sus propias notas.
Nunca se debe confiar en filtros enviados por el frontend para permisos.
```

Prueba de integracion:

```text
backend/tests/integration/grades.test.ts
```

La prueba valida:

```text
Admin configura pesos.
Pesos invalidos devuelven 400.
Profesor no puede calificar curso ajeno.
Profesor crea y actualiza nota manual.
Estudiante no puede filtrar notas de otro estudiante.
Estudiante no puede acceder a configuracion.
Profesor registra asistencia.
Estudiante no puede filtrar asistencia de otro estudiante.
La prueba limpia los datos temporales que crea.
```

---

## Paso 4 - Backend: Modulo de Usuarios

Estado:

```text
Implementado a nivel de codigo para administracion basica.
```

Archivos:

```text
backend/src/controllers/user.controller.ts
backend/src/routes/user.routes.ts
backend/src/schemas/user.schema.ts
backend/src/services/user.service.ts
```

Ruta base:

```text
/api/users
```

Endpoints:

```text
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

Permisos:

```text
ADMIN:
  Lista usuarios.
  Crea usuarios.
  Edita nombre, apellido, email, rol, estado y password.
  Desactiva usuarios.

PROFESOR y ESTUDIANTE:
  No tienen acceso a esta ruta.
```

Reglas:

```text
El email debe ser unico.
La password se guarda con bcrypt.hash(..., 12).
Un admin no puede desactivar su propia cuenta.
DELETE /api/users/:id no borra fisicamente, cambia activo = false.
```

Por que se hizo:

```text
La gestion de cuentas debe vivir en backend para proteger roles y estado.
El frontend solo muestra formularios; Express y Prisma validan la regla real.
```

---

## Paso 5 - Frontend iniciado

Estado:

```text
Frontend avanzado con modulos principales conectados.
Faltan pruebas funcionales con PostgreSQL local levantado y credenciales R2 reales.
```

Carpeta:

```text
frontend/
```

Stack instalado:

```text
Next.js 16.2.7
React 18.3.1
React DOM 18.3.1
NextAuth 4.24.14
TypeScript 5.6.3
```

Nota importante:

```text
La arquitectura original recomendaba Next.js 14.
Se uso Next.js 16.2.7 porque npm audit reporto vulnerabilidades criticas en Next 14.
```

Por que se hizo:

```text
No es buena practica construir una app nueva sobre una version con vulnerabilidades criticas conocidas.
Next 16.2.7 mantiene compatibilidad con React 18 y NextAuth 4.24.14 en este proyecto.
```

Dependencias con override:

```text
postcss -> 8.5.15
uuid    -> 11.1.1
```

Por que se hizo:

```text
npm audit reportaba vulnerabilidades moderadas transitivas en postcss y uuid.
Los overrides dejaron npm audit --omit=dev en 0 vulnerabilities.
```

Archivos principales:

```text
frontend/package.json
frontend/package-lock.json
frontend/tsconfig.json
frontend/next.config.mjs
frontend/.env.example
frontend/middleware.ts
frontend/src/app/layout.tsx
frontend/src/app/globals.css
frontend/src/app/page.tsx
frontend/src/app/api/auth/[...nextauth]/route.ts
frontend/src/lib/auth.ts
frontend/src/lib/backend.ts
frontend/src/lib/env.ts
frontend/src/types/next-auth.d.ts
```

Paginas creadas:

```text
/login
/dashboard
/courses
/grades
/exams
/exams/create
/exams/[id]
/exams/[id]/results
/content
/content/upload
/users
/settings
```

Funcionalidad real:

```text
/login usa NextAuth Credentials.
NextAuth llama al backend POST /api/auth/login.
La sesion guarda backendToken para consumir rutas Express.
/dashboard muestra modulos segun rol.
/courses consume cursos reales y permite gestion administrativa.
/exams lista, crea, publica, permite rendir y consultar resultados.
/content lista, sube, descarga y elimina materiales segun rol.
/grades consume resumenes y permite registrar notas/asistencia para PROFESOR.
/users gestiona cuentas para ADMIN.
/settings gestiona configuracion de calificaciones para ADMIN.
middleware.ts protege rutas segun rol.
```

Componentes y proxies agregados:

```text
frontend/src/components/search-form.tsx
frontend/src/app/api/backend/exams
frontend/src/app/api/backend/exams/[id]/submit
frontend/src/app/api/backend/content
frontend/src/app/api/backend/content/[id]/download
```

Por que se hizo:

```text
Los proxies internos de Next permiten enviar acciones al backend sin exponer backendToken al navegador.
Los filtros de busqueda en /courses, /content y /users son solo visuales; los permisos reales siguen en backend.
```

---

## Variables de entorno necesarias

Regla principal:

```text
Los archivos .env reales no se suben a Git.
Los .env.example si se suben porque no contienen secretos reales.
```

Backend:

```text
backend/.env.example
```

Variables:

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

Frontend:

```text
frontend/.env.example
```

Variables:

```text
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cambiar_por_otra_cadena_segura_diferente
BACKEND_URL=http://localhost:4000
```

Secretos reales que NO deben escribirse en documentacion ni commits:

```text
DATABASE_URL real
JWT_SECRET real
NEXTAUTH_SECRET real
credenciales reales de Cloudflare R2
SMTP_USER real
SMTP_PASS real
SENTRY_DSN real si es privado
tokens de GitHub
contrasenas personales
```

---

## Comandos importantes

Instalar dependencias backend:

```powershell
cd C:\intranet-instituto\backend
npm.cmd install
```

Validar backend:

```powershell
cd C:\intranet-instituto\backend
npm.cmd run typecheck
npm.cmd run build
npm.cmd run prisma:validate
npm.cmd run test:integration
```

Ejecutar backend en desarrollo:

```powershell
cd C:\intranet-instituto\backend
npm.cmd run dev
```

Ejecutar backend compilado:

```powershell
cd C:\intranet-instituto\backend
npm.cmd run build
npm.cmd run start
```

Instalar dependencias frontend:

```powershell
cd C:\intranet-instituto\frontend
npm.cmd install
```

Validar frontend:

```powershell
cd C:\intranet-instituto\frontend
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit --omit=dev
```

Ejecutar frontend:

```powershell
cd C:\intranet-instituto\frontend
npm.cmd run dev
```

Puertos por defecto:

```text
Backend:  http://localhost:4000
Frontend: http://localhost:3000
```

Puertos usados solo en una prueba temporal:

```text
Backend:  http://localhost:4010
Frontend: http://localhost:3010
```

---

## Validaciones realizadas hasta ahora

Backend:

```text
npm.cmd run typecheck -> OK
npm.cmd run build -> OK
npm.cmd run prisma:validate -> OK
npm.cmd run test:integration -> OK en validacion anterior con PostgreSQL disponible
npm.cmd audit --omit=dev -> 0 vulnerabilities
```

Frontend:

```text
npm.cmd run typecheck -> OK
npm.cmd run build -> OK
npm.cmd audit --omit=dev -> 0 vulnerabilities
```

Prueba funcional HTTP del frontend:

```text
/login -> 200
NextAuth credentials con admin@instituto.test -> 200
/dashboard autenticado -> 200
/grades autenticado -> 200
```

Nota:

```text
No se pudo usar el navegador integrado porque no habia instancia disponible.
Se valido por HTTP.
En la ultima sesion, test:integration quedo pendiente de reintentar porque PostgreSQL local no respondia en localhost:5432.
```

---

## Arquitectura actual del codigo

Backend:

```text
backend/src/routes       -> define endpoints
backend/src/controllers  -> maneja req/res
backend/src/services     -> logica de negocio
backend/src/schemas      -> validacion Zod
backend/src/middleware   -> autenticacion, roles, errores, upload
backend/src/utils        -> Prisma, errores, R2
backend/src/types        -> tipos compartidos
backend/tests            -> pruebas de integracion
```

Frontend:

```text
frontend/src/app         -> rutas App Router de Next.js
frontend/src/lib         -> auth, env, cliente backend
frontend/src/components  -> componentes compartidos
frontend/src/types       -> extension de tipos NextAuth
frontend/middleware.ts   -> proteccion de rutas por rol
```

Concepto para estudiar:

```text
El backend es la autoridad de seguridad y negocio.
El frontend solo muestra pantallas y envia acciones.
Aunque el frontend oculte una pagina por rol, el backend siempre vuelve a validar permisos.
```

---

## Endpoints backend actuales

Salud:

```text
GET /health
```

Autenticacion:

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
```

Cursos:

```text
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses
PATCH  /api/courses/:id
POST   /api/courses/:id/enrollments
DELETE /api/courses/:id/enrollments/:studentId
DELETE /api/courses/:id
```

Examenes:

```text
GET   /api/exams
GET   /api/exams/:id
GET   /api/exams/:id/results
POST  /api/exams
PATCH /api/exams/:id/publish
POST  /api/exams/:id/submit
```

Materiales:

```text
GET    /api/content
GET    /api/content/:id
POST   /api/content
GET    /api/content/:id/download
DELETE /api/content/:id
```

Calificaciones:

```text
GET    /api/grades
GET    /api/grades/config/:cursoId
PATCH  /api/grades/config/:cursoId
POST   /api/grades/manual
PATCH  /api/grades/manual/:id
DELETE /api/grades/manual/:id
GET    /api/grades/attendance
POST   /api/grades/attendance
```

Usuarios:

```text
GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

---

## Rutas frontend actuales

```text
/login
/forgot-password
/reset-password
/privacy
/dashboard
/courses
/grades
/exams
/exams/create
/exams/[id]
/exams/[id]/results
/content
/content/upload
/users
/settings
```

Proteccion por rol en frontend:

```text
/dashboard -> ADMIN, PROFESOR, ESTUDIANTE
/courses -> ADMIN, PROFESOR, ESTUDIANTE
/exams -> PROFESOR, ESTUDIANTE
/exams/create -> PROFESOR
/exams/[id] -> PROFESOR, ESTUDIANTE
/exams/[id]/results -> PROFESOR, ESTUDIANTE
/content -> PROFESOR, ESTUDIANTE
/content/upload -> PROFESOR
/grades -> ADMIN, PROFESOR, ESTUDIANTE
/users -> ADMIN
/settings -> ADMIN
```

Rutas publicas:

```text
/login
/forgot-password
/reset-password
/privacy
```

Recordatorio:

```text
La proteccion del frontend mejora experiencia de usuario.
La seguridad real esta en el backend.
```

---

## Cambios importantes y motivos

### Uso de npm.cmd en Windows

Se usa:

```powershell
npm.cmd
```

Motivo:

```text
Evita problemas de politicas de ejecucion de PowerShell con npm.ps1.
```

### Permisos elevados para algunas validaciones

Motivo:

```text
En este entorno, Node/Prisma a veces intenta resolver rutas bajo C:\Users\micha.
El sandbox puede bloquearlo y dar EPERM.
Si Codex pide permiso para ejecutar typecheck, build o Prisma fuera del sandbox, es esperado.
```

### Next.js 16 en vez de Next.js 14

Motivo:

```text
Next 14 estaba alineado con la arquitectura inicial, pero npm reporto vulnerabilidades criticas.
Se eligio Next 16.2.7 para iniciar el frontend con una base parcheada.
```

### Redis, BullMQ y reset de password

Archivos:

```text
backend/src/utils/redis.ts
backend/src/utils/mailer.ts
backend/src/queues/email.queue.ts
backend/src/workers/email.worker.ts
backend/src/schemas/auth.schema.ts
backend/src/controllers/auth.controller.ts
backend/src/routes/auth.routes.ts
backend/src/services/auth.service.ts
frontend/src/app/forgot-password/page.tsx
frontend/src/app/forgot-password/forgot-password-form.tsx
frontend/src/app/reset-password/page.tsx
frontend/src/app/reset-password/reset-password-form.tsx
frontend/src/app/api/password/forgot/route.ts
frontend/src/app/api/password/reset/route.ts
```

Endpoints nuevos:

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Rutas frontend nuevas:

```text
/forgot-password
/reset-password?token=...
```

Funcionamiento:

```text
forgot-password genera un token aleatorio, lo guarda en Redis por 1 hora y encola un email.
El worker de email lee la cola BullMQ y envia por SMTP usando Nodemailer.
reset-password consume el token con GETDEL, actualiza passwordHash con bcrypt costo 12 y evita reutilizacion.
```

Comandos nuevos:

```powershell
cd C:\intranet-instituto\backend
npm.cmd run dev:email-worker
npm.cmd run start:email-worker
```

Decision tecnica:

```text
Se uso BullMQ en lugar de Bull clasico porque Bull 4 dejaba vulnerabilidad moderada transitiva via uuid.
BullMQ mantiene la cola sobre Redis requerida por la arquitectura y conserva npm audit en 0 vulnerabilidades.
```

### CI y Nginx versionados

Archivos:

```text
.github/workflows/ci.yml
infra/nginx/intranet.conf
infra/README.md
```

CI:

```text
El workflow corre en push y pull request hacia dev y main.
Backend usa PostgreSQL 15 y Redis 7 como servicios.
Backend ejecuta Prisma validate, migrate deploy, seed, typecheck, build, test de integracion y audit.
Frontend ejecuta typecheck, build y audit.
```

Nginx:

```text
La plantilla enruta /api/ y /health al backend en 4000.
El resto de rutas van al frontend en 3000.
client_max_body_size esta en 500m para coincidir con el limite de materiales.
El dominio queda como instituto.example.com hasta definir el dominio real.
```

### Politica de privacidad

Archivo:

```text
frontend/src/app/privacy/page.tsx
```

Motivo:

```text
La arquitectura exige informar datos tratados, finalidad, accesos, seguridad y menores bajo la Ley N 29733.
La ruta /privacy es publica y esta enlazada desde /login.
```

### Sentry backend opcional

Archivos:

```text
backend/src/config/sentry.ts
backend/src/config/env.ts
backend/src/middleware/error.middleware.ts
backend/src/app.ts
```

Dependencia:

```text
@sentry/node
```

Motivo:

```text
La arquitectura exige monitoreo de errores.
Sentry se integro de forma opcional: si SENTRY_DSN no existe, no se inicializa y el entorno local no se rompe.
Cuando SENTRY_DSN existe, los errores 500 se capturan con Sentry.
```

### No probar R2 real aun

Motivo:

```text
Se requieren credenciales reales de Cloudflare R2.
El codigo esta preparado, pero no se deben inventar credenciales ni subir secretos.
```

---

## Pendientes tecnicos inmediatos

1. Hacer commit del estado actual cuando el usuario lo autorice.
2. Probar reset de password con Redis y SMTP reales levantados.
3. Probar flujo funcional completo con PostgreSQL local levantado:
   ```text
   login
   recuperacion de contrasena
   dashboard
   cursos e inscripciones
   examenes: crear, publicar, rendir, resultados
   materiales: listar, subir, descargar, eliminar
   notas y asistencia
   usuarios
   settings
   ```
4. Probar subida real a Cloudflare R2 cuando existan credenciales.
5. Probar CI en GitHub despues de subir cambios.
6. Definir proveedor de deploy y secretos reales para CD.
7. Configurar Cloudflare, Nginx real y UptimeRobot cuando exista dominio/URL publica.

---

## Checklist pendiente para lanzar la pagina

### 1. Pruebas locales completas

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

### 2. Servicios reales necesarios

```text
PostgreSQL real para produccion.
Redis real para tokens temporales y colas.
SMTP real para correos.
Cloudflare R2 real para materiales.
Sentry real para errores.
Dominio real conectado a Cloudflare.
Servidor o plataforma de hosting para frontend, backend y worker.
```

### 3. Configuracion de produccion

```text
Variables .env reales en el proveedor de hosting.
JWT_SECRET y NEXTAUTH_SECRET seguros.
FRONTEND_URL, BACKEND_URL y NEXTAUTH_URL con URLs reales.
Nginx configurado con dominio real si se usa servidor propio.
Cloudflare con HTTPS activo.
Worker de email ejecutandose junto al backend.
Migraciones Prisma aplicadas con prisma migrate deploy.
Seed inicial con usuarios/cursos reales si corresponde.
```

### 4. CI/CD y deploy

```text
Subir cambios al repositorio GitHub.
Confirmar que el workflow CI pasa en GitHub.
Definir proveedor: Railway o Render.
Configurar secretos del proveedor sin subirlos a Git.
Crear entorno dev y entorno prod.
Automatizar deploy desde dev/main cuando el proveedor este definido.
```

### 5. Monitoreo y operacion

```text
Sentry recibiendo errores reales.
UptimeRobot apuntando a la URL publica.
Backups automaticos de PostgreSQL verificados.
Backup manual periodico documentado.
Prueba final movil y escritorio.
Revision final de textos visibles y politica de privacidad con datos reales del instituto.
```

---

## Reglas para cualquier IA que continue

1. Trabajar siempre desde:
   ```text
   C:\intranet-instituto
   ```
2. No usar la carpeta de OneDrive.
3. No borrar ni revertir cambios locales sin autorizacion.
4. No subir archivos `.env`.
5. No mostrar secretos reales en respuestas ni documentacion.
6. Mantener validaciones antes de cerrar cambios:
   ```powershell
   cd C:\intranet-instituto\backend
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd run prisma:validate
   npm.cmd run test:integration

   cd C:\intranet-instituto\frontend
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd audit --omit=dev
   ```
7. El backend siempre decide permisos y calculos.
8. El frontend no debe calcular notas ni decidir permisos reales.
9. Si una decision rompe buenas practicas, advertir antes de implementarla.
10. Mantener cambios pequenos y claros.

---

## Resumen para estudiar

El proyecto se construyo por capas:

```text
Primero se preparo Git y entorno.
Luego se modelo la base de datos con Prisma.
Despues se construyo autenticacion.
Luego se implementaron modulos backend: cursos, examenes, materiales y calificaciones.
Finalmente se inicio el frontend con login, sesion, dashboard y calificaciones.
```

Idea central:

```text
El backend es el cerebro: valida, protege, calcula y guarda.
El frontend es la interfaz: muestra pantallas y envia acciones.
La base de datos protege reglas criticas con relaciones e indices unique.
```

Estado final actual:

```text
Backend funcional y validado.
Modulos backend principales implementados: auth, cursos, examenes, materiales, calificaciones y usuarios.
Frontend funcional conectado a los modulos principales.
Sentry backend integrado de forma opcional.
Reset de password integrado con Redis, BullMQ y SMTP.
Politica de privacidad publica agregada.
CI y plantilla Nginx versionados.
Demo publico desplegado parcialmente: backend en Railway, frontend en Render y PostgreSQL en Railway.
Proyecto listo para pruebas funcionales del demo publico; Redis/SMTP/R2/Sentry/UptimeRobot siguen pendientes.
```

---

## Despliegue demo publico - 2026-06-09 America/Lima

Objetivo:

```text
Mostrar el producto funcionando sin comprar dominio todavia.
Usar URLs temporales de plataformas hasta validar el flujo completo.
```

Repositorio usado:

```text
https://github.com/michaelquispehuari-arch/intranet-instituto.git
Rama desplegada: dev
Commit desplegado: 9bdb8c5 Completar frontend e infraestructura inicial
```

Servicios creados:

```text
Railway:
  - backend Express
  - PostgreSQL

Render:
  - frontend Next.js
```

URLs publicas actuales:

```text
Frontend demo:
https://intranet-instituto-frontend.onrender.com

Backend health:
https://intranet-instituto-production.up.railway.app/health
```

Credenciales seed para demo:

```text
admin@instituto.test
profesor.matematica@instituto.test
profesor.comunicacion@instituto.test
estudiante1@instituto.test

Password comun:
Password123!
```

Regla de seguridad:

```text
Estas credenciales son solo datos seed de demostracion.
No usar Password123! en produccion real.
No documentar DATABASE_URL, JWT_SECRET, NEXTAUTH_SECRET, claves R2, SMTP_PASS ni tokens reales.
```

### Railway - Backend

Servicio:

```text
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm run start
Healthcheck Path: /health
```

Variables necesarias en Railway backend:

```text
NODE_ENV=production
PORT=4000
JWT_SECRET=<secreto_largo_real>
FRONTEND_URL=https://intranet-instituto-frontend.onrender.com
DATABASE_URL=<valor_de_DATABASE_PUBLIC_URL_de_PostgreSQL_en_Railway>
REDIS_URL=<pendiente>
CLOUDFLARE_R2_ACCOUNT_ID=<pendiente_real>
CLOUDFLARE_R2_ACCESS_KEY_ID=<pendiente_real>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<pendiente_real>
CLOUDFLARE_R2_BUCKET_NAME=<pendiente_real>
SMTP_HOST=<pendiente_real>
SMTP_PORT=587
SMTP_USER=<pendiente_real>
SMTP_PASS=<pendiente_real>
SMTP_FROM=no-reply@instituto.com
SENTRY_DSN=<opcional_pendiente>
```

Nota real del despliegue:

```text
Railway mostro error P1001 al usar DATABASE_URL interna con host postgres.railway.internal:5432.
Para desbloquear el demo se copio el valor de DATABASE_PUBLIC_URL del servicio PostgreSQL
en la variable DATABASE_URL del backend.
No pegar esa URL real en documentacion ni chats.
```

Comandos ejecutados en Railway backend > Console:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Resultado:

```text
Backend desplegado correctamente.
/health responde OK.
Login desde frontend Render probado correctamente con usuario seed.
```

### Render - Frontend

Servicio:

```text
Name: intranet-instituto-frontend
Branch: dev
Language: Node
Region: Oregon US West
Root Directory: frontend
Build Command: npm ci && npm run build
Start Command: npm run start
```

Variables necesarias en Render frontend:

```text
BACKEND_URL=https://intranet-instituto-production.up.railway.app
NEXTAUTH_URL=https://intranet-instituto-frontend.onrender.com
NEXTAUTH_SECRET=<secreto_largo_real>
```

Resultado:

```text
Build OK.
Deploy OK.
URL publica disponible en Render.
Login con admin@instituto.test probado correctamente.
```

Advertencia Render Free:

```text
La instancia gratuita puede dormir por inactividad.
La primera carga puede tardar 50 segundos o mas.
```

### Limitaciones actuales del demo

```text
No hay dominio propio todavia.
No hay worker de email desplegado porque Railway solo quedo con backend + PostgreSQL.
Reset de password por correo queda pendiente.
Redis real queda pendiente.
Cloudflare R2 real queda pendiente; subida/descarga real de materiales puede fallar hasta configurarlo.
Sentry real queda pendiente.
UptimeRobot queda pendiente hasta decidir URL final.
```

### Flujo para continuar desde aqui

```text
1. Probar modulos desde el frontend Render:
   login, dashboard, cursos, examenes, notas, usuarios, settings y contenido.
2. Configurar Cloudflare R2 real y reemplazar variables R2 del backend.
3. Configurar Redis real compatible con BullMQ.
4. Configurar SMTP real.
5. Desplegar email-worker cuando exista cupo/servicio adicional o mover todo a un proveedor con mas servicios.
6. Configurar Sentry.
7. Configurar UptimeRobot apuntando al frontend y backend health.
8. Comprar dominio solo cuando el demo ya este validado.
```

---

## Actualizacion 2026-06-10 - servicios externos y diagnostico

Cambios aplicados:

```text
R2 ahora es opcional al iniciar backend.
Si R2 falta, materiales devuelve 503 solo al subir, descargar o eliminar archivos.
Se agrego GET /health/ready para diagnosticar PostgreSQL, Redis, R2, SMTP y Sentry.
GET /health sigue siendo el endpoint liviano para Railway.
BullMQ soporta REDIS_URL con rediss:// para Redis con TLS.
El backend cierra la cola de email al apagar.
El email-worker inicializa Sentry y valida SMTP al iniciar.
Los proxies internos de Next preservan mensajes de error del backend.
/settings muestra al ADMIN el estado de PostgreSQL, Redis, R2, SMTP y Sentry.
```

Endpoint nuevo:

```text
Backend readiness:
https://intranet-instituto-production.up.railway.app/health/ready

Este endpoint devuelve 200 solo cuando PostgreSQL, Redis, R2, SMTP y Sentry estan configurados.
Si falta alguno, devuelve 503 con el detalle por servicio.
```

Validacion:

```text
backend typecheck: OK
backend build: OK
backend prisma validate: OK
backend test integration: OK
backend audit --omit=dev: 0 vulnerabilities
frontend typecheck: OK
frontend build: OK (20 rutas)
frontend audit --omit=dev: 0 vulnerabilities
```

Siguiente paso real:

```text
Configurar Redis, SMTP y R2 reales en Railway.
Desplegar email-worker como servicio separado.
Revisar /health/ready hasta que cambie de degraded a ready.
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
Cloudflare R2 usa placeholders temporales.
SMTP usa placeholders temporales.
SENTRY_DSN esta vacio.
```

Decision tecnica:

```text
El codigo detecta placeholders como temporal, pendiente y smtp.example.com.
Estos valores se muestran como missing en /health/ready y no se tratan como configuracion valida.
```
