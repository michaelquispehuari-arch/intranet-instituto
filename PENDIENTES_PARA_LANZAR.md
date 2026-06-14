# Pendientes para lanzar — Intranet Educativa

Fecha: 2026-06-14
Propósito: lo que falta para dejar la plataforma lista y en línea, una vez construida la estructura del documento de contexto. Dividido en lo que Claude Code puede terminar (código) y lo que solo tú puedes hacer (cuentas, credenciales, despliegue).

---

## 0. Cómo leer esto

```text
Parte A  -> código. Se lo puedes pasar a Claude Code para que lo termine.
Parte B  -> servicios y cuentas reales. Los configuras tú (no se pueden automatizar ni inventar credenciales).
Parte C  -> despliegue (poner la app en línea).
Parte D  -> carga de datos reales.
Parte E  -> checklist final antes de abrir al público.
Orden recomendado: A -> B -> C -> D -> E.
Regla de seguridad: ninguna credencial real va en Git ni en este documento. Solo en el .env del hosting.
```

---

## Parte A — Gaps de código (para Claude Code)

```text
A1. CRONOGRAMA DE NOTAS (la vista que pediste: aprobado/desaprobado fácil de leer)
    - Endpoint GET /api/grades/timeline
        ADMIN: todos los alumnos y cursos | PROFESOR: sus cursos | ESTUDIANTE: solo el suyo.
        Devuelve por alumno y por curso/semana: notaFinal, aprobado (bool) y estado (en curso / cerrado).
    - Pantalla /calificaciones con la línea de tiempo semanal:
        chip verde = aprobado, chip clay = desaprobado, tenue = en curso. Lectura de un vistazo.

A2. NOTIFICACIONES POR EMAIL (reutiliza la cola BullMQ y el mailer que ya existen)
    - Correo de bienvenida con credenciales al crear un profesor o alumno (lo dispara el ADMIN).
    - Aviso cuando se publica un examen y cuando se publican notas.
    - Siempre por la cola, nunca de forma síncrona.

A3. REGLAS DE NEGOCIO NUEVAS + PRUEBAS DE INTEGRACIÓN
    - Sustitutorio automático: contar de verdad los cursos desaprobados del alumno (<= 3 habilita).
    - Cálculo 50/50 con casos borde (sin notas, sin asistencia) -> sección 5 del documento de contexto.
    - Tests para: sesiones, asistencia por sesión, resúmenes (plazo y permisos),
      configuración de Zoom, sustitutorio y cronograma.

A4. SEED ACTUALIZADO
    - Sembrar 2-3 sesiones por curso y un valor inicial de enlace_zoom en la tabla Configuracion.

A5. RESPONSIVE / MÓVIL
    - Sidebar colapsable; tarjetas y tablas legibles en teléfono.
      Muchos usuarios entran desde el celular, así que esto no es opcional.

A6. ESTADOS VACÍOS Y ERRORES en las pantallas nuevas
    - Mensajes claros ("Aún no hay grabación de esta clase"), nunca pantallas en blanco.

A7. VALIDACIONES después de cada cambio (no declarar nada listo sin esto):
        backend:  typecheck, build, prisma:validate, test:integration, audit --omit=dev
        frontend: typecheck, build, audit --omit=dev
```

---

## Parte B — Servicios reales que configuras tú

No puedo crear estas cuentas ni escribir sus credenciales por ti. Aquí queda qué hace falta y para qué, para que lo configures.

```text
PostgreSQL de producción   (Railway o Render)   -> sin esto no hay datos reales.
Redis de producción                              -> tokens de reset, progreso de examen, colas.
Cloudflare R2 (bucket + 4 credenciales)          -> sin esto, material y resúmenes NO suben de verdad.
SMTP / Resend                                    -> sin esto, reset de password y correos no se envían.
Sentry DSN                                       -> opcional pero recomendado para ver errores reales.
Dominio en Cloudflare + HTTPS (SSL Full Strict)  -> dirección pública segura.
```

Estas credenciales se ponen como variables `.env` en el panel del hosting, nunca en el código ni en GitHub. Las variables exactas que el proyecto espera están en `backend/.env.example` y `frontend/.env.example`.

---

## Parte C — Despliegue (poner la app en línea)

```text
1. Elegir proveedor: Railway o Render (tu arquitectura ya los contempla).
2. Se despliegan 3 procesos: frontend (Next), backend (Express) y el worker de email.
3. En el primer despliegue: aplicar migraciones y seed inicial.
       npx prisma migrate deploy
       npm run prisma:seed   (con datos reales, no los de prueba)
4. Configurar los secretos en el panel del proveedor (los pones tú).
5. Nginx real solo si usas servidor propio; con Railway/Render no hace falta.
6. UptimeRobot apuntando a la URL pública (avisa si la página se cae).
7. Verificar que el proveedor tiene backups automáticos de PostgreSQL activados,
   y dejar además un backup manual semanal en un lugar externo.
```

Plantilla de workflow de despliegue automático. Va en `.github/workflows/deploy.yml`. Los pasos finales dependen del proveedor: confirma el comando o la acción oficial en la documentación vigente de Railway/Render antes de usarlo.

```yaml
name: deploy
on:
  push:
    branches: [main]   # despliega solo cuando se hace merge a main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Instalar y construir backend
        working-directory: backend
        run: |
          npm ci
          npm run build

      - name: Aplicar migraciones en producción
        working-directory: backend
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy

      # PASO DE DESPLIEGUE DEL PROVEEDOR (rellenar):
      # Railway -> usar la GitHub Action oficial de Railway o 'railway up' con RAILWAY_TOKEN.
      # Render  -> activar Auto-Deploy desde el panel, o usar su Deploy Hook.
      # Recuerda desplegar también el worker de email como proceso aparte.
      # - name: Desplegar
      #   run: <comando del proveedor>
      #   env:
      #     PROVIDER_TOKEN: ${{ secrets.PROVIDER_TOKEN }}
```

---

## Parte D — Carga de datos reales

```text
1. Crear el ADMIN real y cambiar de inmediato la contraseña del seed (Password123!).
2. Crear los profesores (los pastores) y entregarles credenciales -> usa el correo de bienvenida (A2).
3. Crear los alumnos.
4. Crear los cursos reales con sus sesiones (días de clase).
5. Poner el enlace de Zoom real en Configuración.
6. Revisar los pesos 50/50 por curso o dejar el valor por defecto.
7. Completar la política de privacidad con los datos reales del instituto
   (Ley N° 29733; consentimiento del padre/tutor si hay menores de edad).
```

---

## Parte E — Checklist final antes de abrir al público

```text
[ ] Login con ADMIN, PROFESOR y ESTUDIANTE.
[ ] Dashboard correcto por rol.
[ ] Curso: crear, asignar profesor, crear sesiones, subir material, crear examen, ver alumnos, ver notas.
[ ] Sesión: pegar grabación (YouTube), subir capturas, marcar asistencia a mano, recibir resúmenes con plazo.
[ ] Examen: crear, publicar, rendir, salir y reingresar dentro del tiempo, calificar abiertas, revelar respuestas al cerrar.
[ ] Notas: cronograma aprobado/desaprobado claro y por rol.
[ ] Sustitutorio: aparece automático (<=3 jalados) y el admin puede habilitar manual.
[ ] Zoom: el botón redirige y el admin puede cambiar el enlace en cualquier momento.
[ ] Reset de password funcionando con Redis y SMTP reales.
[ ] Subida y descarga real de archivos a Cloudflare R2.
[ ] Prueba completa en móvil y en escritorio.
[ ] Sentry recibe errores reales; UptimeRobot activo; backups verificados.
```

---

## Actualizacion de pendientes - 2026-06-14 cierre actual

Estado actual:

```text
La Parte A de codigo quedo mayormente cerrada para demo:
- Cronograma /calificaciones implementado.
- Sesiones, resumenes, Zoom global y sustitutorios implementados.
- Seed actualizado con sesiones y enlace_zoom.
- Sidebar responsive y shell principal implementados.
- Estados vacios y manejo de error en Material agregados.
- Usuarios, Material y Examenes viven dentro del shell.
- Correos por cola implementados a nivel de codigo.

La app esta lista para prueba demo con credenciales seed.
No esta lista aun para lanzamiento institucional final.
```

URLs para prueba:

```text
Frontend:
https://intranet-instituto-frontend.onrender.com

Backend health:
https://intranet-instituto-production.up.railway.app/health
```

Credenciales demo:

```text
admin@instituto.test
profesor.matematica@instituto.test
profesor.comunicacion@instituto.test
estudiante1@instituto.test

Password:
Password123!
```

Servicios reales ya validados:

```text
PostgreSQL Railway -> OK
Redis Railway      -> OK
Cloudflare R2      -> OK
Backend Railway    -> OK
Frontend Render    -> OK
```

Servicios reales pendientes:

```text
SMTP real con dominio verificado -> pendiente
Email worker desplegado          -> pendiente
Sentry                           -> pendiente opcional
Dominio propio                   -> pendiente
Cloudflare DNS/HTTPS             -> pendiente
UptimeRobot                      -> pendiente
Backups verificados              -> pendiente
```

Pendientes criticos antes de lanzamiento institucional:

```text
1. Rotar secretos expuestos previamente en chat.
2. Comprar dominio.
3. Configurar Cloudflare DNS y HTTPS.
4. Configurar SMTP real con dominio verificado.
5. Desplegar email-worker.
6. Probar reset de password real.
7. Actualizar politica de privacidad con datos reales.
8. Cargar usuarios, cursos y sesiones reales.
9. Probar flujos completos con ADMIN, PROFESOR y ESTUDIANTE en escritorio y movil.
10. Activar UptimeRobot y verificar backups de PostgreSQL.
```

Checklist funcional para probar ahora en demo:

```text
[ ] Login con ADMIN.
[ ] Login con PROFESOR.
[ ] Login con ESTUDIANTE.
[ ] /inicio muestra contenido segun rol.
[ ] Sidebar permanece visible al navegar.
[ ] /cursos lista cursos.
[ ] /cursos/[id] abre workspace del curso.
[ ] /cursos/[id]/sesiones/[sesionId] abre detalle de sesion.
[ ] /material lista materiales o muestra vacio/error claro.
[ ] /material/subir permite subir archivo con ADMIN o PROFESOR.
[ ] Descargar material desde R2.
[ ] /exams lista examenes.
[ ] Crear examen como PROFESOR.
[ ] Publicar examen.
[ ] Rendir examen como ESTUDIANTE.
[ ] Ver resultados.
[ ] /calificaciones muestra cronograma.
[ ] /usuarios permite crear/editar/desactivar usuarios como ADMIN.
[ ] /configuracion permite cambiar Zoom y ver readiness.
[ ] /sustitutorios muestra elegibles.
```

Validaciones tecnicas recientes:

```text
backend typecheck         -> OK
backend build             -> OK
backend prisma:validate   -> OK
backend audit --omit=dev  -> OK

frontend typecheck        -> OK
frontend build            -> OK
frontend audit --omit=dev -> OK

backend test:integration  -> pendiente local porque PostgreSQL local localhost:5432 no estaba levantado.
PostgreSQL real del demo esta en Railway y no debe usarse para tests destructivos.
```

---

## Resumen

```text
Lo que Claude Code puede cerrar ahora: Parte A (cronograma, correos, reglas+tests, seed, móvil, estados vacíos).
Lo que depende de ti: Partes B, C y D (cuentas, credenciales, despliegue y datos reales).
Cuando A-D estén hechos, corre la Parte E completa antes de abrir al público.
```
