# Índice de documentación — Intranet Instituto

Toda la documentación viva del proyecto vive en esta carpeta, en un solo nivel. Antes de hacer un cambio, busca aquí qué documento aplica — lee la descripción de una línea para decidir si necesitas abrirlo completo, no abras todo por costumbre.

Esta carpeta no se actualiza sola. Si agregas una pantalla, un servicio nuevo o cambias una regla de negocio, actualiza el documento correspondiente (o crea uno nuevo y agrégalo aquí).

## Infraestructura y despliegue

1. [Partes del proyecto](./01-partes-del-proyecto.md) — mapa de carpetas: qué archivo tocar para cambiar un texto, una imagen, una opción de menú o una conexión backend/frontend.
2. [Servicios externos](./02-servicios-externos.md) — Railway (backend + frontend + PostgreSQL + Redis) y Cloudflare R2: qué hace cada uno aquí y cómo se configura.
3. [Base de datos en Railway](./03-base-de-datos-railway.md) — cómo ver y editar los datos reales, cómo corren las migraciones y el seed.
8. [Infraestructura: Nginx y CI](./08-infra-nginx-ci.md) — plantilla Nginx (solo si algún día se usa servidor propio) y qué valida el pipeline de CI en GitHub Actions.
9. [Despliegue en Railway](./09-deploy-railway.md) — guía operativa paso a paso: variables de entorno de cada servicio, dominio propio, Cloudflare R2, SMTP, email-worker.

## Flujo de trabajo

4. [Git: subir y revertir cambios](./04-git-guia.md) — comandos del día a día, cómo deshacer un error, y el flujo `dev` (local) → `main` (producción, dispara redeploy en Railway).
7. [Desarrollo local](./07-desarrollo-local.md) — levantar Postgres/Redis con Docker y correr backend + frontend en tu PC antes de subir a producción. Leer antes de tocar cualquier código.
10. [Sesión y autenticación](./10-sesion-y-autenticacion.md) — por qué la sesión no vencía por inactividad y los cursos "desaparecían" (401 silencioso), y los tres mecanismos que lo corrigen: `maxAge` de NextAuth, `middleware.ts` y el interceptor de fetch. Leer antes de tocar login, `authOptions` o cualquier `fetch` a `/api/backend/*`.

## Auditoría y mantenimiento de datos

5. [Auditoría y pruebas (2026-07-01)](./05-auditoria-y-pruebas.md) — registro de la revisión de seguridad, conexiones, código muerto y carga hecha en esa fecha: qué se encontró, qué se corrigió y qué quedó pendiente.
6. [Reset total de Railway](./06-reset-total-railway.md) — cómo borrar todos los datos de prueba (o absolutamente todo), o solo los estudiantes (Opción C, conserva cursos/profesores). Usar con cuidado: **el proyecto ya tiene usuarios reales** (desde 2026-07-23), esto ya no es una operación libre de riesgo.

## Arquitectura y lógica de negocio (qué hace el sistema, no cómo se despliega)

- [Contexto de implementación](./CONTEXTO_IMPLEMENTACION_INTRANET.md) — modelo de datos y endpoints de Sesiones, Resúmenes, Configuración global (Zoom) y Sustitutorios; jerarquía Curso → Sesión; permisos por rol. Leer antes de tocar el schema de Prisma o esos módulos.
- [Registro y cálculo de notas](./REGISTRO_Y_CALCULO_NOTAS.md) — fórmula real de la nota de asistencia (símbolos F/A/M/C/T/J), de dónde sale la NT (transcripción) y la nota de examen, y el registro de estudiantes estilo Excel. **Leer siempre antes de tocar cualquier cosa relacionada a notas/calificaciones** — la fórmula es específica y fácil de romper sin darse cuenta.
- [Correcciones: sesiones y publicación de notas](./CORRECCIONES_SESIONES_Y_PUBLICAR_NOTAS.md) — por qué la grilla completa de notas es solo-ADMIN, cómo funciona el botón "Mandar notas" (snapshot con `notaFinalPublicada`), y el schema mínimo para que guardar una sesión no falle.
- [Errores: sesiones, exámenes y transcripción](./ERRORES_SESIONES_EXAMENES_TRANSCRIPCION.md) — el modelo de tiempo del examen (`disponibleDesde` + `duracionMinutos` + `ingresoHastaMin`, cierre global, resultados solo tras el cierre) y cómo se conecta la transcripción del alumno a la NT. Leer antes de tocar la lógica de exámenes.
- [Correcciones: navegación y módulos](./CORRECCIONES_NAVEGACION_Y_MODULOS.md) — la regla de "una sola forma de llegar a cada pantalla" (módulos por-curso solo dentro del workspace del curso, nunca sueltos en el sidebar) y el mapa final de sidebar/pestañas por rol.

## Frontend y diseño

- [Inventario de pantallas](./FRONTEND_PANTALLAS_COMPLETO.md) — cada pantalla del sistema, sus campos, botones y a qué endpoint llama. Punto de partida obligatorio antes de tocar cualquier pantalla existente o crear una nueva.
- [Guía de diseño (PeRTS)](./GUIA_FRONTEND_PeRTS.md) — sistema de diseño: tokens de color/tipografía (`frontend/src/app/tokens.css`), componentes base (botón, card, tabla, chip), catálogo de animaciones y diccionario de copy (qué texto técnico no debe verse en pantalla).

---

**Regla rápida:** si el cambio es de infraestructura/despliegue/entorno → sección 1. Si es de flujo de git/local → sección 2. Si vas a tocar notas, exámenes, sesiones o permisos → sección 3 (léelo aunque parezca que ya sabes, la lógica de notas es la parte más fácil de romper). Si es una pantalla nueva o un ajuste visual → sección 4.
