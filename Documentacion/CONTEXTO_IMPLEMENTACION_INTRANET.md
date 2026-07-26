# Contexto de implementación — Intranet Educativa

> **Contiene:** modelo de datos y endpoints de Sesiones, Resúmenes, Configuración global (Zoom) y Sustitutorios; jerarquía Curso → Sesión; permisos por rol (ADMIN/PROFESOR/ESTUDIANTE); estructura de carpetas del frontend. Leer antes de tocar el schema de Prisma o esos módulos del backend/frontend. Complementar con [REGISTRO_Y_CALCULO_NOTAS.md](./REGISTRO_Y_CALCULO_NOTAS.md) para la fórmula real de notas (esta guía tiene una versión simplificada, ya reemplazada).

Fecha: 2026-06-14
Propósito: este documento es la fuente de verdad de PRODUCTO y ESTRUCTURA para implementar la plataforma. Las reglas generales de programación viven en el CLAUDE.md global; aquí va TODO lo específico del proyecto. Léelo completo antes de tocar código.

---

## 0. Cómo usar este documento (para el agente)

```text
1. Lee este documento completo antes de implementar cualquier cosa.
2. Respeta el orden de fases de la sección 10. No saltes fases.
3. No rompas lo que ya funciona (ver sección 11: qué NO tocar).
4. Corre las validaciones de la sección 12 antes de declarar algo como hecho.
5. El backend es la autoridad: decide permisos y calcula notas. El frontend solo muestra y envía acciones.
6. Si una decisión contradice buenas prácticas, advierte antes de implementarla.
```

---

## 1. Contexto del proyecto

```text
Qué es: intranet educativa para un instituto en Perú (pastores de Corea entre los usuarios).
Formato: cursos intensivos que duran 1 semana, 2 ciclos de 4 meses al año, ~200 usuarios.
Carpeta de trabajo: C:\intranet-instituto  (NO usar OneDrive)
Stack: Next.js 16 (frontend) + Express/TypeScript/Prisma/PostgreSQL (backend) + Redis + BullMQ + Cloudflare R2.
Roles: ADMIN, PROFESOR, ESTUDIANTE.
Estado actual: auth, cursos, exámenes, materiales, calificaciones y usuarios ya implementados y validados.
Lo que falta es lo que describe este documento.
```

---

## 2. Decisiones de producto validadas (mandan sobre cualquier suposición)

```text
1. Zoom: un único enlace global para todo el ciclo. El admin lo cambia en cualquier momento.
   -> vive en la tabla Configuracion, NO en el curso ni en la sesión.
2. Material y capturas: los sube siempre el admin. El profesor puede subir material a veces.
   El alumno solo descarga; lo único que sube es su resumen cuando NO asistió.
   El admin marca internamente a quién le toca subir resumen.
3. Exámenes escritos (respuesta abierta): los califica el admin. En el futuro, el profesor.
4. Promedio final = 50% asistencia + 50% (exámenes + resúmenes + exposiciones).
   La nota de asistencia se ingresa a mano por ahora; el método de medición se definirá después.
5. Sustitutorio: el sistema valida automáticamente quién califica (jaló <= 3 cursos),
   y además el admin puede habilitarlo manualmente.
6. Login: simple, con credenciales que entrega el admin. Sin auto-registro.
```

---

## 3. Jerarquía conceptual (la capa nueva es Sesión)

```text
CICLO (config global, incluye el enlace Zoom)
  └── CURSO (dura 1 semana, tiene tipo y profesor asignado)
        ├── Nivel curso (toda la semana)
        │     ├── Material semanal (PDF)
        │     ├── Exámenes (marcar / escribir)
        │     ├── Exposiciones y actividades
        │     └── Nota final
        └── SESIÓN (cada día de clase)   <-- CAPA NUEVA
              ├── Asistencia manual (por cámara)
              ├── Grabación del día (YouTube)
              ├── Capturas de pizarra
              └── Resúmenes de alumnos
```

`Sesion` es la pieza nueva. De ella cuelgan asistencia diaria, grabaciones, capturas y resúmenes con fecha límite.

---

## 4. Modelo de datos (Prisma concreto)

Aplica estos cambios en `backend/prisma/schema.prisma`. Mantén el estilo actual (id cuid, relaciones, índices unique).

### 4.1 Enums nuevos

```prisma
enum TipoCurso {
  REGULAR
  ENTRENAMIENTO
  ESPECIAL
}

enum TipoMaterial {
  MATERIAL_CURSO
  CAPTURA_PIZARRA
}

enum EstadoResumen {
  PENDIENTE
  ENTREGADO
  REVISADO
}

enum OrigenHabilitacion {
  AUTOMATICO
  MANUAL
}

enum EstadoCalificacion {
  AUTO
  PENDIENTE
  CALIFICADA
}

enum TipoNotaManual {
  EXPOSICION
  ACTIVIDAD
  PARTICIPACION
}
```

Y agrega `ABIERTA` al enum existente:

```prisma
enum TipoPregunta {
  OPCION_MULTIPLE
  VERDADERO_FALSO
  ABIERTA          // NUEVO: respuesta escrita, se califica a mano
}
```

### 4.2 Modelos nuevos

```prisma
model Sesion {
  id              String   @id @default(cuid())
  cursoId         String
  fecha           DateTime
  titulo          String        // "Clase lunes", "Sesión 2", etc.
  enlaceGrabacion String?       // link de YouTube, se llena tras la clase
  orden           Int
  creadoEn        DateTime @default(now())

  curso       Curso            @relation(fields: [cursoId], references: [id])
  asistencias Asistencia[]
  materiales  Material[]
  resumenes   EntregaResumen[]
}

model EntregaResumen {
  id           String        @id @default(cuid())
  sesionId     String
  estudianteId String
  urlR2        String?       // archivo en R2 (null si aún no sube)
  entregadoEn  DateTime?
  fechaLimite  DateTime?     // editable por el admin
  estado       EstadoResumen @default(PENDIENTE)
  requerido    Boolean       @default(false)  // true solo a quien el admin marque

  sesion     Sesion  @relation(fields: [sesionId], references: [id])
  estudiante Usuario @relation(fields: [estudianteId], references: [id])

  @@unique([sesionId, estudianteId])
}

model HabilitacionSustitutorio {
  id            String             @id @default(cuid())
  estudianteId  String
  cursoId       String
  origen        OrigenHabilitacion @default(AUTOMATICO)
  habilitadoPor String?            // id del admin si fue manual
  creadoEn      DateTime           @default(now())

  estudiante Usuario @relation(fields: [estudianteId], references: [id])
  curso      Curso   @relation(fields: [cursoId], references: [id])

  @@unique([estudianteId, cursoId])
}

model Configuracion {
  id            String   @id @default(cuid())
  clave         String   @unique   // ej: "enlace_zoom"
  valor         String
  actualizadoEn DateTime @updatedAt
}
```

### 4.3 Cambios a modelos existentes

```prisma
// Curso: agregar tipo y relaciones nuevas
model Curso {
  // ...campos actuales...
  tipo          TipoCurso                  @default(REGULAR)   // NUEVO
  sesiones      Sesion[]                                       // NUEVO
  habilitaciones HabilitacionSustitutorio[]                    // NUEVO
}

// Material: opcionalmente pertenece a una sesión; tipo de material
model Material {
  // ...campos actuales...
  sesionId String?       @map("sesion_id")   // NUEVO: si está, es material/captura del día
  tipo     TipoMaterial  @default(MATERIAL_CURSO)  // NUEVO
  sesion   Sesion?       @relation(fields: [sesionId], references: [id])  // NUEVO
}

// Asistencia: ahora por sesión, con observación interna del admin
model Asistencia {
  // ...campos actuales (estado: PRESENTE | AUSENTE | TARDANZA)...
  sesionId    String   // NUEVO: reemplaza el control por fecha suelta
  observacion String?  // NUEVO: nota interna del admin ("2 de 3 cámaras")
  sesion      Sesion   @relation(fields: [sesionId], references: [id])  // NUEVO

  @@unique([estudianteId, sesionId])   // reemplaza @@unique([estudianteId, cursoId, fecha])
}

// Pregunta: para ABIERTA, respuestaCorrecta puede quedar vacía
model Pregunta {
  // ...campos actuales...
  // respuestaCorrecta sigue existiendo; para tipo ABIERTA se permite cadena vacía
}

// RespuestaEstudiante: soporte de calificación manual
model RespuestaEstudiante {
  // ...campos actuales...
  puntajeManual      Float?              // NUEVO: para abiertas
  estadoCalificacion EstadoCalificacion  @default(AUTO)  // NUEVO
}

// Examen: revelar respuestas y marcar sustitutorio
model Examen {
  // ...campos actuales...
  revelarRespuestas Boolean @default(true)   // NUEVO: al cerrar plazo, todos ven correctas
  esSustitutorio    Boolean @default(false)  // NUEVO
}

// NotaManual: tipo de nota académica
model NotaManual {
  // ...campos actuales...
  tipo TipoNotaManual @default(ACTIVIDAD)  // NUEVO
}

// ConfigCurso: pesos 50/50 (reemplaza pesoExamenes / pesoNotasManuales)
model ConfigCurso {
  // ...id, cursoId...
  pesoAsistencia  Float @default(0.5)   // CAMBIO
  pesoAcademico   Float @default(0.5)   // CAMBIO (académico = exámenes + resúmenes + exposiciones)
  notaAprobatoria Float @default(11)
}
```

Recuerda agregar en `Usuario` las relaciones inversas: `resumenes EntregaResumen[]` y `habilitaciones HabilitacionSustitutorio[]`.

> El cambio en `ConfigCurso` y en `Asistencia` es rompedor (breaking). Hay que crear migración y ajustar `grade.service.ts` y cualquier código que use los pesos viejos o la asistencia por fecha.

---

## 5. Cálculo de la nota final (lo hace SIEMPRE el backend)

```text
notaFinal = (notaAsistencia * pesoAsistencia) + (promedioAcademico * pesoAcademico)

notaAsistencia    -> la ingresa el admin a mano (0 a 20). Método de medición a definir después.
promedioAcademico -> promedio en escala 0-20 de:
                       - exámenes completados
                       - resúmenes calificados
                       - exposiciones / actividades (NotaManual)
pesoAsistencia = 0.5, pesoAcademico = 0.5 (configurable por curso en ConfigCurso)
aprobado = notaFinal >= notaAprobatoria (default 11)

Casos borde:
- Si no hay ninguna nota académica todavía -> promedioAcademico = null, mostrar "sin notas aún", no 0.
- Si no hay notaAsistencia ingresada -> tratar asistencia como pendiente, no como 0.
- Escala siempre 0-20. Redondear solo para mostrar, no para almacenar.
```

---

## 6. Backend: módulos y contratos de endpoints

Mantén la separación actual: routes / controllers / services / schemas / middleware / utils.

### 6.1 Archivos nuevos

```text
routes/session.routes.ts        controllers/session.controller.ts      services/session.service.ts        schemas/session.schema.ts
routes/config.routes.ts         controllers/config.controller.ts       services/config.service.ts
routes/substitution.routes.ts   controllers/substitution.controller.ts services/substitution.service.ts
```

### 6.2 Archivos a ajustar

```text
services/grade.service.ts    -> nuevo cálculo 50/50
services/exam.service.ts     -> preguntas ABIERTA + revelar respuestas + sustitutorio
services/content.service.ts  -> material por sesión + capturas de pizarra
prisma/seed.ts               -> sembrar sesiones de ejemplo y un valor inicial de enlace_zoom
```

### 6.3 Contratos de endpoints nuevos / ajustados

```text
SESIONES
GET    /api/courses/:id/sessions
   rol: ADMIN (todas) | PROFESOR (de sus cursos) | ESTUDIANTE (de cursos donde está inscrito)
   res: lista de sesiones con { id, fecha, titulo, enlaceGrabacion, orden }

POST   /api/courses/:id/sessions          rol: ADMIN
   body: { fecha, titulo, orden }
   res:  sesión creada

PATCH  /api/sessions/:id                  rol: ADMIN
   body: { titulo?, fecha?, enlaceGrabacion?, orden? }

GET    /api/sessions/:id
   rol: según pertenencia al curso
   res: detalle + materiales de sesión + (admin/profesor) asistencia y resúmenes

ASISTENCIA (por sesión, manual)
GET    /api/sessions/:id/attendance       rol: ADMIN | PROFESOR (solo ver)
POST   /api/sessions/:id/attendance       rol: ADMIN
   body: [{ estudianteId, estado: PRESENTE|AUSENTE|TARDANZA, observacion? }]
   nota: upsert por (estudianteId, sesionId); se puede corregir las veces que haga falta

RESÚMENES
GET    /api/sessions/:id/summaries        rol: ADMIN | PROFESOR
POST   /api/sessions/:id/summaries        rol: ESTUDIANTE (multipart/form-data, campo file)
   regla: solo si requerido=true para ese alumno Y dentro de fechaLimite
PATCH  /api/summaries/:id/deadline        rol: ADMIN   body: { fechaLimite }   (abrir/cerrar/mover)
PATCH  /api/summaries/:id/review          rol: ADMIN   body: { estado: REVISADO }
POST   /api/sessions/:id/summaries/require rol: ADMIN  body: { estudianteIds: [] }  (marca a quién le toca)

MATERIAL POR SESIÓN
POST   /api/sessions/:id/content          rol: ADMIN (siempre) | PROFESOR (a veces)
   body: multipart/form-data, tipo = CAPTURA_PIZARRA

CONFIGURACIÓN GLOBAL
GET    /api/config/zoom                   rol: cualquiera autenticado   res: { enlaceZoom }
PATCH  /api/config/zoom                    rol: ADMIN   body: { enlaceZoom }

EXÁMENES (ajustes)
PATCH  /api/exams/:id/grade-open          rol: ADMIN
   body: [{ respuestaId, puntajeManual }]   -> marca estadoCalificacion = CALIFICADA
GET    /api/exams/:id/results
   revela respuestaCorrecta SOLO si pasó disponibleHasta y revelarRespuestas = true

SUSTITUTORIOS
GET    /api/substitutions/eligible        rol: ADMIN   -> alumnos con <= 3 cursos desaprobados
POST   /api/substitutions                  rol: ADMIN   body: { estudianteId, cursoId }  (manual)
```

---

## 7. Frontend: estructura y navegación

### 7.1 Principios de diseño (la app debe verse sofisticada, no amontonada)

```text
1. Menú lateral fijo (sidebar) con los módulos del rol. Siempre visible.
2. Workspace de curso: al entrar a un curso se abre su espacio con pestañas internas.
3. Drill-down: cada clic lleva a una pantalla más específica, con botón claro de "volver".
4. Tarjetas para listas; tablas solo para datos densos (notas, asistencia).
5. Botón de Zoom destacado y siempre visible en el contexto del curso.
6. Estados vacíos amables ("Aún no hay grabación de esta clase").
```

### 7.2 Carpetas (App Router)

```text
frontend/src/app/
  (auth)/ login/ forgot-password/ reset-password/
  (app)/
    layout.tsx                 sidebar + topbar comunes
    dashboard/
    cursos/
      page.tsx                 lista de cursos
      [id]/
        page.tsx               workspace del curso (pestañas)
        sesiones/[sesionId]/   detalle de sesión
    examenes/[id]/ examenes/[id]/resultados/
    calificaciones/            cronograma aprobado/desaprobado
    usuarios/                  solo admin
    sustitutorios/             solo admin
    configuracion/             solo admin (enlace Zoom)
  privacy/
  components/
    sidebar.tsx  course-workspace-tabs.tsx  zoom-button.tsx  session-card.tsx  grade-timeline.tsx
```

### 7.3 Navegación pantalla por pantalla

```text
ADMIN
  Inicio          resumen: cursos activos, alumnos, pendientes de revisar
  Cursos          lista -> clic en curso -> WORKSPACE con pestañas:
                    Resumen | Sesiones | Material | Exámenes | Alumnos | Notas
                  dentro de Sesiones -> clic en día -> DETALLE DE SESIÓN:
                    Grabación (link YouTube) | Capturas (subir) | Asistencia (marcar/corregir) | Resúmenes (ver, fecha límite, revisar)
  Calificaciones  cronograma global de todos los alumnos y cursos
  Usuarios        crear profesores y alumnos, entregar credenciales
  Sustitutorios   lista automática (<=3 jalados) + habilitar manual
  Configuración   enlace Zoom del ciclo, fechas del ciclo

PROFESOR
  Inicio          su curso de la semana + botón Zoom destacado
  Mi curso        WORKSPACE (vista profesor): Sesiones | Material | Alumnos | Asistencia (solo ver)

ESTUDIANTE
  Inicio          su curso activo + botón Zoom grande
  Mi curso        WORKSPACE (vista alumno): Clases | Material | Examen | Mis resúmenes
                  dentro de Clases -> clic en día -> DETALLE DE SESIÓN (alumno):
                    Ver grabación | Ver capturas | Subir mi resumen (solo si le toca y dentro de plazo)
  Mis notas       su cronograma: cursos aprobados / desaprobados
```

### 7.4 Sistema de diseño (look)

Dirección: un espacio de estudio sereno y confiable, no un SaaS llamativo. La identidad la cargan el verde estudio (marca y barra lateral), el ámbar cálido (acción) y el fondo papel claro.

```text
PALETA
  Verde estudio (marca, sidebar)     #103D38    hover #16514A
  Texto sobre verde                  #A9C4BD    activo #F4F0E6
  Ámbar acción (Zoom, primaria)      #BE7A12    texto #FFFFFF
  Ámbar acento (detalles, activos)   #D69A2C
  Fondo de página                    #F6F7F5
  Superficie / tarjeta               #FFFFFF    borde #E7E5DE
  Texto principal                    #1C2522    secundario #5C6360    tenue #8A8E89
  Estado aprobado                    texto #2C6A48  fondo #E3F1E8
  Estado desaprobado                 texto #B5482F  fondo #F6E7E2
  Estado pendiente                   texto #8A5A0C  fondo #FBEFD6
  Info / capturas                    texto #2B5C8A  fondo #EEF4FB

TIPOGRAFÍA (importar desde Google Fonts)
  Títulos (display)   Fraunces, serif, peso 400-500. Solo títulos de página y números grandes.
  Cuerpo / interfaz   Source Sans 3, peso 400/500/600. Todo el texto de UI.
  Números de notas    usar tabular-nums para que las columnas de notas alineen.

ESCALA Y ESPACIADO
  Título de página 24-25px serif | Sección 18px | Cuerpo 14-15px | Etiqueta 12-13px | mínimo 11px.
  Radios: 8px controles, 12px tarjetas, 14px contenedores. Bordes 0.5px.
  Ritmo vertical en múltiplos de 4 (8 / 12 / 16 / 20px).

COMPONENTES CLAVE
  - Sidebar fijo verde; ítem activo con borde ámbar a la izquierda + fondo translúcido.
  - Topbar del curso: eyebrow (tipo de curso) + título serif + botón Zoom ámbar siempre visible.
  - Pestañas subrayadas (underline ámbar en la activa), no botones tipo cápsula.
  - Tarjeta de sesión: fecha a la izquierda, día + chips de estado al centro, chevron a la derecha.
    La sesión de hoy lleva borde ámbar a la izquierda.
  - Chips de estado (grabación, capturas, resumen, aprobado/desaprobado) con los colores de la paleta.
  - Acción primaria = ámbar; secundarias = borde 0.5px sobre fondo claro.

MOTION (sobrio)
  - Transición suave al cambiar de pestaña y hover de tarjeta (elevación mínima).
  - Respetar prefers-reduced-motion. Sin animaciones decorativas.

ACCESIBILIDAD
  - Contraste AA, foco de teclado visible, responsive hasta móvil (sidebar colapsable).
```

> Esta paleta y tipografía son la base. El mismo lenguaje visual se aplica a las tres vistas (admin, profesor, estudiante); solo cambian los módulos del sidebar y el contenido.

---

## 8. Flujos clave

```text
EXAMEN (reingreso + revelado)
1. El alumno entra. El backend revisa que no lo haya enviado ya.
2. Se registra iniciadoEn; el temporizador corre en pantalla; el backend manda la hora límite.
3. El progreso se guarda en Redis. Si sale y vuelve dentro del tiempo, recupera lo que llevaba.
4. Al enviar, el backend recalcula el puntaje de las preguntas de marcar.
5. Las preguntas ABIERTA quedan PENDIENTE; el admin las califica con /grade-open.
6. Al pasar disponibleHasta con revelarRespuestas=true, todos ven su nota y las correctas.

ASISTENCIA (manual, por cámara)
1. El admin abre la sesión del día.
2. Marca PRESENTE/AUSENTE/TARDANZA a cada alumno según su criterio (horas de cámara).
3. Puede dejar observacion ("2 de 3 cámaras"). Se corrige cuando haga falta.
4. La nota de asistencia (0-20) que entra al promedio la pone el admin a mano por ahora.

RESÚMENES (fecha límite editable)
1. El admin marca, en la sesión, a qué alumnos les toca subir resumen (los que no asistieron).
2. El alumno ve "Subir mi resumen" solo si le toca y el plazo sigue abierto.
3. El admin mueve/cierra/reabre la fechaLimite cuando quiera.
4. El admin revisa y marca como REVISADO.

SUSTITUTORIO
1. El sistema lista alumnos con <= 3 cursos desaprobados (califican).
2. El admin puede habilitar a alguien manualmente.
3. Al habilitado se le activa el examen con esSustitutorio = true.
```

---

## 9. Permisos resumidos

```text
                        ADMIN     PROFESOR        ESTUDIANTE
Crear cursos            sí        no              no
Asignar profesor        sí        no              no
Crear exámenes          sí        (futuro)        no
Calificar abiertas      sí        (futuro)        no
Subir material/capturas sí        a veces         no (solo descarga)
Subir resumen           no        no              sí (si le toca)
Registrar asistencia    sí        no (solo ver)   no (solo la suya)
Cambiar enlace Zoom     sí        no              no
Ver cronograma          todos     sus cursos      solo el suyo
Crear usuarios          sí        no              no
Habilitar sustitutorio  sí        no              no
```

Regla de oro: el backend decide permisos y calcula notas; el frontend solo muestra y envía acciones.

---

## 10. Plan de implementación por fases

```text
FASE A — Base de datos
  - Aplicar los cambios de schema de la sección 4.
  - npx prisma migrate dev --name sesiones_resumenes_config
  - Actualizar seed.ts: crear 2-3 sesiones por curso y un valor inicial de enlace_zoom.
  HECHO CUANDO: prisma:validate OK, migración aplicada, seed corre sin error.

FASE B — Backend
  - Crear módulos session, config, substitution (routes + controller + service + schema).
  - Ajustar grade.service.ts al cálculo 50/50 (sección 5).
  - Ajustar exam.service.ts: preguntas ABIERTA, grade-open, revelado por plazo, sustitutorio.
  - Ajustar content.service.ts: material por sesión y capturas.
  - Registrar las rutas nuevas en app.ts.
  HECHO CUANDO: typecheck + build OK, endpoints responden con permisos correctos por rol.

FASE C — Frontend (reorganización)
  - Introducir sidebar fijo + layout (app).
  - Convertir la página de curso en workspace con pestañas.
  - Crear la ruta de detalle de sesión.
  HECHO CUANDO: navegación drill-down funciona, build OK, sin romper rutas existentes.

FASE D — Pantallas por rol
  - Completar las vistas de admin, profesor y estudiante de la sección 7.3.
  - Conectar cada pantalla a su endpoint vía proxy interno (no exponer backendToken).
  HECHO CUANDO: cada rol ve solo lo suyo y los flujos de la sección 8 funcionan de punta a punta.
```

---

## 11. Qué NO tocar (no romper lo que funciona)

```text
- No cambiar el flujo de auth (login, JWT, cookie HttpOnly, middleware de roles) salvo lo indicado.
- No exponer el backendToken al navegador: el frontend habla al backend por proxies internos de Next.
- No eliminar físicamente datos: el borrado de cursos/usuarios es lógico (activo = false).
- No subir archivos .env reales ni credenciales a Git.
- No mover el proyecto a OneDrive.
- No inventar credenciales reales de R2/SMTP/Sentry; el código queda listo pero no se prueban sin credenciales reales.
```

---

## 12. Validaciones obligatorias antes de cerrar cualquier cambio

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

Las pruebas de integración pueden requerir PostgreSQL local levantado en localhost:5432.
