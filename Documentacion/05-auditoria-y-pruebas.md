# Auditoría de seguridad, conexiones y código muerto — 2026-07-01

> **Contiene:** registro histórico de una auditoría puntual (qué se corrigió, qué se verificó sin hallazgos, prueba de carga). Es un snapshot fechado, no un checklist vivo — útil para no repetir una revisión ya hecha, no para saber el estado actual del sistema.

Registro de la revisión completa pedida antes del lanzamiento: conexiones, seguridad entre cuentas, ataques, carga, código sin uso y pantallas sin conectar. El proyecto todavía no tenía usuarios reales en esta fecha, por eso se pudieron correr pruebas de carga y seguridad sin restricción de entorno.

## Corregido

**Conexiones**
- `frontend/.env` apuntaba a puertos de una prueba temporal (`3010`/`4010`) que no coincidían con el backend real ni con CI/documentación (`3000`/`4000`) → corregido.

**Seguridad**
- `frontend/lib/auth.ts` copiaba el `backendToken` al objeto `session` de NextAuth, que SÍ viaja al navegador vía `useSession()`/`GET /api/auth/session`. Esto violaba la regla del proyecto de nunca exponer ese token al cliente (cualquiera podía leerlo con las herramientas de desarrollador). Corregido: el token ya no sale de la cookie httpOnly; `frontend/src/lib/backend.ts` lo lee server-side con `getToken()` de `next-auth/jwt`. Validado con un login real de punta a punta: la sesión que ve el navegador ya no incluye el token, y las llamadas al backend (vía los proxies) siguen funcionando igual.
- No había límite de intentos en login/recuperar contraseña (fuerza bruta posible) → agregado `express-rate-limit` en `backend/src/routes/auth.routes.ts` (10 intentos/15min en login, 5/hora en forgot/reset password). Probado: al intento #11 desde la misma IP responde `429`.
- `frontend/middleware.ts` decidía el acceso por rol según el ORDEN de un objeto (frágil: un reordenamiento futuro podía exponer una pantalla). Corregido para usar la coincidencia de ruta más específica en vez de depender del orden. Impacto real era bajo porque el backend igual habría rechazado la petición.

**Código muerto (borrado — 100% sin uso confirmado)**
- `frontend/_starter/` (plantilla vieja, 4 archivos) y `frontend/starter/` (carpeta vacía)
- `frontend/src/components/sidebar.tsx` — reemplazado hace tiempo por `app-shell.tsx`, ya no lo importaba nadie
- `frontend/src/components/module-shell.tsx`, `frontend/src/components/search-form.tsx`
- `frontend/src/components/ui/Skeleton.tsx` (y su export en `ui/index.ts`)

**Duplicados corregidos (convertidos a redirect, mismo patrón que `users`→`usuarios` y `dashboard`→`inicio`)**
- `frontend/src/app/courses/page.tsx` → ahora redirige a `/cursos` (antes era una copia completa y desactualizada, solo alcanzable escribiendo la URL a mano)
- `frontend/src/app/grades/page.tsx` → ahora redirige a `/calificaciones`

## Verificado sin hallazgos (no se tocó nada)

- **Autorización por rol en el backend**: cada ruta de escritura (crear/editar/borrar) exige el rol correcto.
- **IDOR**: un estudiante no puede ver notas/datos de otro cambiando un ID en la URL o query — se filtra por el usuario autenticado en cada service.
- **Inyección SQL**: todo el acceso a datos usa Prisma; el único `$queryRaw` es un `SELECT 1` literal (health check).
- **XSS**: cero usos de `dangerouslySetInnerHTML`/`innerHTML`.
- **CSRF**: cookies `httpOnly` + `sameSite=lax`, razonable para JWT strategy.
- **Contraseñas**: `bcrypt` (cost 12), tokens de reset de un solo uso con vencimiento de 1 hora, el endpoint de "olvidé mi contraseña" no revela si el email existe.
- `npm audit --omit=dev`: 0 vulnerabilidades en `backend` y en `frontend`.
- Tests de integración (`grades.test.ts`, `exams.test.ts`): ambos pasan.

## Prueba de carga

Contra un backend real (Postgres + Redis en contenedores locales, mismo código que producción), endpoint autenticado normal:

| Conexiones simultáneas | Duración | Resultado |
|---|---|---|
| 50 | 15s | ~440 req/s, 113ms latencia promedio, 0 errores |
| 200 | 15s | 4804 requests, 100% status 200, 0 errores/timeouts (latencia sube a ~613ms promedio pero no cae) |

Para el tamaño de un instituto, esto es más margen del que se va a necesitar en el día a día.

## Documentado pero no resuelto (decisión pendiente del usuario)

- `frontend/src/app/settings/page.tsx`: pantalla completa y funcional (configura el peso de asistencia/promedio académico por curso) pero **ningún link del sitio apunta ahí**. No es lo mismo que `/configuracion` (esa es el enlace de Zoom global). Se dejó un comentario en el archivo explicando esto. Falta decidir: ¿enlazarla desde `/cursos/[id]` o eliminarla si ya no hace falta?
- 24 archivos `.md` sueltos en la raíz del proyecto (`DOCUMENTACION_AVANCE_*`, `CORRECCIONES_*`, etc.) — historial de avances, no se tocaron. Candidatos a mover dentro de `docs/` si se quiere ordenar la raíz del proyecto más adelante.
- `/material` no aparece en el menú lateral — **no es un error**, confirmado con el usuario: se accede desde dentro de cada curso, no desde el menú global.

## Pendientes de antes (sin cambios en esta sesión)

- Subir capturas de pizarra en sesión: el botón existe en la UI, falta la lógica.
- Panel de habilitación manual de sustitutorios: hoy solo lista elegibles, falta la acción de habilitar manualmente.

## Cuando el proyecto ya tenga usuarios reales

Estas pruebas de carga y seguridad se corrieron libremente porque no había estudiantes ni profesores usando el sistema todavía. Una vez lanzado, repetir pruebas de carga contra el entorno real deja de ser gratis (riesgo de afectar gente de verdad) — mover esas pruebas a un entorno local o de staging antes de repetirlas.
