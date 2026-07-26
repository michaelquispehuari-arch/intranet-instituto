# Inventario Completo de Pantallas — Intranet Instituto

> **Contiene:** cada pantalla del sistema, sus campos, botones, roles que la ven y a qué endpoint del backend llama, más el mapa completo de navegación. Punto de partida obligatorio antes de tocar cualquier pantalla existente o crear una nueva — evita romper un botón o un endpoint que no viste.
>
> Documento de referencia para rediseño de UI. Cubre cada pantalla, sus acciones, botones y conexiones backend.
> Roles: **ADMIN** · **PROFESOR** · **ESTUDIANTE**

---

## ESTRUCTURA GENERAL

### Layout raíz
- Páginas bajo `(app)/` → envueltas en `AppShell` (sidebar + main-content)
- Páginas bajo `(auth)/` y `login/` → sin sidebar, pantalla completa
- Páginas públicas (`privacy/`) → sin autenticación

### Sidebar (visible en todas las páginas `(app)/`)
| Item | Roles | URL |
|------|-------|-----|
| Inicio | ADMIN, PROFESOR, ESTUDIANTE | `/inicio` |
| Cursos / Mi curso | ADMIN, PROFESOR, ESTUDIANTE | `/cursos` |
| Calificaciones / Mis notas | ADMIN, PROFESOR, ESTUDIANTE | `/calificaciones` |
| Estudiantes | ADMIN | `/estudiantes` |
| Profesores | ADMIN | `/profesores` |
| Sustitutorios | ADMIN | `/sustitutorios` |
| Configuración | ADMIN | `/configuracion` |

**Footer sidebar:** Nombre del usuario + botón **"Cerrar sesión"** → `signOut` → `/login`

---

## 1. LOGIN

**URL:** `/login` · **Acceso:** Público

### Contenido
- Título: "Intranet Instituto"
- Subtítulo: "Acceso para estudiantes, profesores y administradores."
- Formulario de acceso

### Campos
| Campo | Tipo | Validación |
|-------|------|-----------|
| Email | email | required |
| Contraseña | password | required |

### Botones / Links
| Elemento | Acción |
|----------|--------|
| **"Ingresar"** (submit) | POST next-auth `/api/auth/signin` con credenciales → redirige a `/inicio` |
| "Olvidé mi contraseña" (link) | Navega a `/forgot-password` |
| "Política de privacidad" (link) | Navega a `/privacy` |

---

## 2. RECUPERAR CONTRASEÑA

**URL:** `/forgot-password` · **Acceso:** Público

### Campos
| Campo | Tipo | Validación |
|-------|------|-----------|
| Correo institucional | email | required |

### Botones / Links
| Elemento | Acción |
|----------|--------|
| **"Enviar enlace"** (submit) | POST `/api/password/forgot` → `{ email }` |
| "Volver al login" (link) | Navega a `/login` |

---

## 3. NUEVA CONTRASEÑA

**URL:** `/reset-password?token={token}` · **Acceso:** Público (requiere token en URL)

### Campos
| Campo | Tipo | Validación |
|-------|------|-----------|
| Nueva contraseña | password | minLength=8, required |
| Confirmar contraseña | password | debe coincidir, required |

### Botones / Links
| Elemento | Acción |
|----------|--------|
| **"Actualizar contraseña"** (submit) | POST `/api/password/reset` → `{ token, password }` |
| "Volver al login" (link) | Navega a `/login` |

*Si no hay token en URL: muestra error, sin formulario.*

---

## 4. POLÍTICA DE PRIVACIDAD

**URL:** `/privacy` · **Acceso:** Público

### Contenido
Texto estático con secciones: datos tratados, finalidad, acceso, seguridad, menores de edad, conservación.

### Botones
| Elemento | Acción |
|----------|--------|
| **"Volver al login"** | Navega a `/login` |

---

## 5. INICIO / DASHBOARD

**URL:** `/inicio` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/courses` · `GET /api/config/zoom`

---

### Vista ADMIN
- Saludo: "Hola, {nombre}"
- Cards de estadísticas: cursos activos, cursos totales, zoom configurado

**Grid de accesos rápidos (7 cards):**
| Card | Icono | Descripción | Destino |
|------|-------|-------------|---------|
| Cursos | 📚 | Gestionar cursos y sesiones | `/cursos` |
| Calificaciones | 📊 | Cronograma de notas por alumno | `/calificaciones` |
| Usuarios | 👥 | Profesores y alumnos | `/usuarios` |
| Profesores | 👨‍🏫 | Registro y cuentas docentes | `/profesores` |
| Sustitutorios | 🔄 | Alumnos elegibles | `/sustitutorios` |
| Configuración | ⚙️ | Zoom y ajustes globales | `/configuracion` |
| Exámenes | 📝 | Crear y revisar exámenes | `/exams` |

---

### Vista PROFESOR
- Saludo + "Tu clase de esta semana"
- **Botón Zoom** (si configurado): "🎥 Unirse a Zoom ahora" → enlace externo (nueva pestaña)
- Card del primer curso activo → clickeable → `/cursos/{id}`
- Si más de 1 curso: link "Ver todos mis cursos ({count}) →"

---

### Vista ESTUDIANTE
- Saludo + "Tu curso activo esta semana"
- **Botón Zoom** (si configurado): "🎥 Unirse a la clase por Zoom" → enlace externo
- Card del curso activo (badge "Curso activo", nombre, descripción, profesor)

**Grid de accesos rápidos (si inscrito):**
| Card | Icono | Destino |
|------|-------|---------|
| Ver sesiones | 📅 | `/cursos/{id}` |
| Mis exámenes | 📝 | `/exams` |
| Material | 📁 | `/content` |
| Mis notas | 📊 | `/calificaciones` |

---

## 6. CURSOS — LISTADO

**URL:** `/cursos` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/backend/courses` · `POST /api/backend/courses` · `DELETE /api/backend/courses/{id}` · `GET /api/backend/users`

### Header
- Eyebrow: "Academia" · Título: "Cursos"
- Si ADMIN: botón **"+ Nuevo curso"** (despliega formulario)

### Formulario de creación (solo ADMIN, expandible)
| Campo | Tipo | Validación |
|-------|------|-----------|
| Nombre del curso | text | 3–120 caracteres, required |
| Profesor | select | opciones de `/api/backend/users` (PROFESOR), required |
| Ciclo | number | 1–2, required |
| Año | number | 2026–2100, required |
| Descripción | textarea | 0–500 caracteres |

| Botón | Acción |
|-------|--------|
| **"Crear curso"** | POST `/api/backend/courses` |
| "Cancelar" | Cierra formulario |

### Grid de cursos
Cada card muestra: tipo de curso · nombre · descripción · profesor · ciclo/año · badge "Inactivo" si aplica

| Elemento | Roles | Acción |
|----------|-------|--------|
| Click en card | Todos | Navega a `/cursos/{id}` |
| **"Eliminar curso"** (rojo) | ADMIN, solo activos | DELETE `/api/backend/courses/{id}` |

---

## 7. DETALLE DE CURSO — WORKSPACE

**URL:** `/cursos/[id]` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/backend/courses/{id}` · `GET /api/backend/courses/{id}/sessions` · `GET /api/backend/exams?cursoId={id}` · `GET /api/backend/content?cursoId={id}` · `GET /api/backend/config/zoom` · y más (ver por tab)

### Top Bar (sticky)
- Link: "← Cursos"
- Tipo de curso · Nombre del curso (título)
- Si hay Zoom: botón **"🎥 Unirse a Zoom"** → enlace externo

### Tabs disponibles por rol
| Tab | ADMIN | PROFESOR | ESTUDIANTE |
|-----|-------|----------|------------|
| Sesiones | ✓ | ✓ | ✓ |
| Material | ✓ | ✓ | ✓ |
| Exámenes | ✓ | ✓ | ✓ |
| Notas | ✓ (grilla completa) | ✓ (publicadas) | ✗ |
| Alumnos | ✓ | ✓ | ✗ |
| Transcripción | ✗ | ✗ | ✓ |

---

### Tab: SESIONES

**Backend:** `POST /api/backend/courses/{id}/sessions` · `PATCH /api/backend/sessions/{sesionId}`

**Contenido:** "Clases grabadas"

**Cada sesión (session-card):**
- Fecha (día/mes) · Título · Badge "Hoy" si aplica · Badge "🎬 Grabación" si tiene enlace
- Link **"Ver grabación"** → YouTube (externo), si tiene enlace
- Texto "Grabación pendiente." si no tiene enlace
- Si ADMIN: input para pegar link YouTube + botón **"Guardar link"** → PATCH `/api/backend/sessions/{sesionId}`

**Formulario crear sesión (solo ADMIN):**
| Campo | Tipo | Validación |
|-------|------|-----------|
| Título | text | required |
| Link YouTube | text | URL válida de YouTube |

| Botón | Acción |
|-------|--------|
| **"Publicar clase"** | POST `/api/backend/courses/{id}/sessions` |

---

### Tab: MATERIAL

**Backend:** `GET /api/backend/content?cursoId={id}` · `DELETE /api/backend/content/{id}` · `GET /api/backend/content/{id}/download`

**Contenido:** "Material del curso"

| Elemento | Roles | Acción |
|----------|-------|--------|
| Botón **"+ Subir material"** | ADMIN, PROFESOR | Navega a `/material/subir?cursoId={id}` |
| Botón **"Ver / Descargar"** | Todos | GET `/api/backend/content/{id}/download` |
| Botón **"Eliminar"** (rojo) | ADMIN, PROFESOR | DELETE `/api/backend/content/{id}` |

Cada archivo muestra: icono por tipo · nombre · descripción · fecha · tamaño

---

### Tab: EXÁMENES

**Backend:** `GET /api/backend/exams?cursoId={id}`

**Contenido:** "Exámenes del curso"

| Elemento | Roles | Acción |
|----------|-------|--------|
| Botón **"+ Crear examen"** | ADMIN, PROFESOR | Navega a `/exams/create?cursoId={id}` |
| Botón **"Dar examen"** | ESTUDIANTE (ventana activa) | Navega a `/exams/{examId}` |
| Botón **"Ver"** | ADMIN, PROFESOR | Navega a `/exams/{examId}` |
| Botón **"Resultados"** | ADMIN, PROFESOR o si hay envíos | Navega a `/exams/{examId}/results` |

Cada examen muestra: título · duración · preguntas · fechas inicio/cierre · badges de estado · count de envíos

---

### Tab: NOTAS

**Backend (ADMIN):** `GET /api/backend/courses/{id}/grades-sheet` · `POST /api/backend/courses/{id}/grades/publish`
**Backend (PROFESOR):** `GET /api/backend/courses/{id}/grades`

**Vista ADMIN:**
- Instrucción: "Edita celdas de cámara, NT y publica notas desde la grilla completa."
- Botón **"Abrir grilla de notas"** → `/cursos/{id}/notas`

**Vista PROFESOR:**
- "Calificaciones publicadas"
- Tabla: Apellidos y Nombres · Nota Final (chip verde ≥11, rojo <11)
- Si no publicadas: empty state

---

### Tab: ALUMNOS

**Contenido:** "Alumnos matriculados"

Tabla: Cód. · Apellidos · Nombres · Email

---

### Tab: TRANSCRIPCIÓN (solo ESTUDIANTE)

**Backend:** `GET /api/backend/courses/{id}/summaries/mine` · `POST /api/backend/sessions/{sesionId}/summaries/self-upload`

**Contenido:** Instrucción de uso + lista de primeras 3 sesiones

**Cada sesión:**
- Label: "Día {N} — {titulo}"
- Si ya subió: "{count} archivo(s) · fecha entrega · NT: {nota} si calificado" · Badge verde "Entregada ✓"
- Input file (acepta: .pdf, .doc, .docx, .jpg, .jpeg, .png, .zip) — múltiple
- Botón **"Subir"** (si hay archivos seleccionados) → POST `.../summaries/self-upload` (FormData)

---

## 8. DETALLE DE SESIÓN

**URL:** `/cursos/[id]/sesiones/[sesionId]` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/backend/sessions/{sesionId}` · `POST /api/backend/sessions/{sesionId}/attendance` · `PATCH /api/backend/summaries/{summaryId}/review`

### Header
- Link: "← {nombre_curso}"
- Eyebrow: fecha (ej. "lunes, 27 de junio") · Título: título de la sesión

### Tabs
| Tab | Roles |
|-----|-------|
| Grabación | Todos |
| Capturas | Todos |
| Asistencia | ADMIN, PROFESOR |
| Resúmenes | Todos |

---

### Tab: GRABACIÓN
- Si hay enlace: botón **"🎬 Ver grabación en YouTube"** → externo
- Si no hay: "Aún no hay grabación"

### Tab: CAPTURAS
- Título: "Capturas de pizarra"
- Si ADMIN/PROFESOR: botón **"+ Subir captura"**
- Listado de capturas (nombre + tipo)

### Tab: ASISTENCIA (ADMIN, PROFESOR)
Tabla por estudiante: nombre + email

| Elemento | Roles | Acción |
|----------|-------|--------|
| Select estado ("Presente" / "Ausente" / "Tardanza") | ADMIN | editable por celda |
| Badge de estado | PROFESOR | solo lectura |
| Botón **"Guardar asistencia"** | ADMIN | POST `/api/backend/sessions/{sesionId}/attendance` |

### Tab: RESÚMENES

**Cada resumen:**
- Nombre del estudiante (si no es ESTUDIANTE) · Plazo · Estado (chip)
- Si ADMIN/PROFESOR con archivos: botón **"Ver archivos ({count})"** → abre múltiples pestañas
- Si ADMIN/PROFESOR y estado="ENTREGADO":
  - Input número: "NT (0–18)" (paso 0.5)
  - Botón **"Marcar revisado"** → PATCH `/api/backend/summaries/{summaryId}/review`
- Si ESTUDIANTE pendiente: botón **"Subir resumen"**

---

## 9. GRILLA DE NOTAS

**URL:** `/cursos/[id]/notas` · **Roles:** ADMIN, PROFESOR

**Backend:** `GET /api/backend/courses/{id}/grades-sheet` · `POST /api/backend/courses/{id}/grades-sheet` · `POST /api/backend/courses/{id}/grades/publish`

### Header
- Link: "← Volver al curso"
- Eyebrow: "Notas semanales" · Título: "Grilla de calificaciones" (ADMIN) / "Calificaciones publicadas" (PROFESOR)

**Vista ADMIN — controles:**
| Elemento | Acción |
|----------|--------|
| Botones "1" "2" "3" | Seleccionar número de días de clase |
| Botón **"Mandar notas"** | POST `/api/backend/courses/{id}/grades/publish` |
| Timestamp "Publicadas {hora}" | Solo lectura (si ya publicadas) |

**Tabla Excel-like (ADMIN):**
- Columnas por día: celdas de cámara (S/A/M) · NT · Asistencia · Examen · Nota Final
- Cada fila: datos del estudiante + celdas editables
- Botón **"Guardar"** por fila → POST `/api/backend/courses/{id}/grades-sheet`
- Color: verde ≥11, rojo <11, gris sin nota

**Leyenda:** F=Falta −6.67 · A=Cámara apagada −5 · M=Mal enfocada −4 · C/T=Código/Tardanza −2 · J=Justificada

**Vista PROFESOR:** solo lectura — tabla Cód. · Apellidos y Nombres · Nota Final

---

## 10. EXÁMENES — LISTADO

**URL:** `/exams` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/exams`

### Header
- Eyebrow: rol · Título: "Exámenes"
- Si ADMIN/PROFESOR: botón **"+ Nuevo examen"** → `/exams/create`

### Cada examen (card)
- Estado badge · Título · Descripción
- Metadata: Curso · Duración · Preguntas · Publicado

| Botón | Roles | Acción |
|-------|-------|--------|
| **"Dar examen"** | ESTUDIANTE (disponible) | Navega a `/exams/{id}` |
| **"Abrir"** | ADMIN, PROFESOR | Navega a `/exams/{id}` |
| **"Resultados"** | ADMIN, PROFESOR; o si hay envíos | Navega a `/exams/{id}/results` |
| **"Publicar"** | ADMIN, PROFESOR (borrador) | POST `/api/backend/exams/{id}/publish` |

---

## 11. CREAR EXAMEN

**URL:** `/exams/create?cursoId={id}` · **Roles:** ADMIN, PROFESOR

**Backend:** `GET /api/courses` · `POST /api/backend/exams`

### Header
- Link: "← Exámenes" · Título: "Nueva evaluación"

### Campos generales
| Campo | Tipo | Validación |
|-------|------|-----------|
| Título | text | 3–150 caracteres, required |
| Curso | select | opciones de `/api/courses`, required |
| Duración total (min) | number | 2–300, default=30, required |
| Inicio de ingreso | datetime-local | opcional |
| Ventana de ingreso (min) | number | 1–299, default=10; < duración total |
| Descripción | textarea | 0–500 caracteres |

### Preguntas (sección dinámica)
Cada pregunta tiene:
- Select tipo: **Opción múltiple** / **Verdadero/Falso** / **Respuesta abierta**
- Textarea de pregunta (3–1000 caracteres)
- Si OPCION_MULTIPLE: lista de opciones (2–6); radio para marcar correcta; botones "+/−" opciones
- Si VERDADERO_FALSO: opciones fijas "Verdadero" / "Falso"
- Si ABIERTA: sin opciones
- Campo puntaje (0.1–20, step=0.1)

| Botón | Acción |
|-------|--------|
| **"Agregar pregunta"** | Añade fieldset de pregunta |
| **"Quitar pregunta"** | Elimina esta pregunta (si hay más de 1) |
| **"Agregar opción"** | Añade opción (si < 6 opciones) |
| **"x"** en opción | Elimina opción (si > 2 opciones) |
| **"Crear examen"** (submit) | POST `/api/backend/exams` → redirige a `/exams` |

---

## 12. TOMAR EXAMEN / VER EXAMEN

**URL:** `/exams/[id]` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/exams/{id}` · `POST /api/backend/exams/{id}/submit`

### Header
- Link: "← Exámenes" · Badge curso · Título · Descripción + duración

### Vista ESTUDIANTE — ya envió o completó
| Estado | Contenido |
|--------|-----------|
| Sustitutorio enviado | "Examen finalizado" · "Tu respuesta fue registrada. El administrador revisará y publicará la nota." · Botón **"Volver a exámenes"** → `/exams` |
| Examen normal enviado | "Examen enviado" · "Tu envío ya fue registrado." · Botón **"Ver resultado"** → `/exams/{id}/results` |

### Vista ESTUDIANTE — puede rendir (TakeExamForm)
- Badge: "Tiempo restante: {MM}:{SS}" (cuenta regresiva)
- Stack de preguntas (fieldsets):
  - Badge "Pregunta {N}" · Texto · "Puntaje: {valor}"
  - Si ABIERTA: textarea (máx 2000 caracteres)
  - Si MULTIPLE/V-F: radio buttons con opciones
- Botón **"Enviar examen"** (disabled si tiempo=0 o sin responder todo) → POST `.../submit`
  - Si sustitutorio: muestra estado "Finalizado"
  - Si normal: redirige a `/exams/{id}/results`

### Vista ADMIN / PROFESOR
- Stack de preguntas (solo lectura):
  - Título · Puntaje · Opciones (marca verde en correcta)
  - Si ABIERTA: texto "Respuesta abierta para calificación manual."

---

## 13. RESULTADOS DE EXAMEN

**URL:** `/exams/[id]/results?studentId={id}` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/exams/{id}/results`

### Navegación según estado
| Estado URL | Vista |
|-----------|-------|
| Sin `?studentId` (ADMIN/PROFESOR) | Lista de alumnos |
| Con `?studentId` (ADMIN/PROFESOR) | Respuestas de ese alumno |
| ESTUDIANTE | Siempre sus propias respuestas |

### Vista ADMIN/PROFESOR — Lista de alumnos (sin studentId)
- Badge: "Resultados" · Subtítulo: "{count} alumno(s) completaron el examen."
- **Cada envío (card):**
  - Nombre · Email · Fecha/hora · Badge "{puntos} pts"
  - Botón **"Ver examen"** → `/exams/{id}/results?studentId={studentId}`

### Vista ADMIN/PROFESOR — Detalle alumno (con studentId)
- Link: "← Lista de alumnos"
- Subtítulo: "{nombre} {apellido} · {email}" · Badge "Puntaje total: {puntos} pts" · Timestamp
- **Cada respuesta (answer-row):**
  - Texto de pregunta · "Respuesta: {respuesta}"
  - PENDIENTE: "Pendiente de calificación manual" (amarillo)
  - Correcta: "Correcta · {puntos} pts" (verde)
  - Incorrecta: "Incorrecta · {puntos} pts · Correcta: {respuesta_correcta}" (rojo)

### Vista ESTUDIANTE
- Badge: "Mi resultado" · "Puntaje total: {puntos}"
- **Cada respuesta (answer-row):**
  - Texto · "Respuesta: {respuesta}" · Correcta/Incorrecta con puntos y respuesta correcta

### Empty states
- Sin envíos: "Sin envíos completados."
- Antes del cierre: "El resultado estará disponible a partir de las {hora}, cuando cierre el examen para todos."
- Sustitutorio (ESTUDIANTE): "RESULTS_NOT_AVAILABLE" → mensaje de acceso no disponible

---

## 14. MATERIAL — BIBLIOTECA

**URL:** `/material?q={busqueda}&cursoId={id}` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/content` · `DELETE /api/content/{id}` · `GET /api/backend/content/{id}/download`

### Header
- Eyebrow: "Recursos" · Título: "Biblioteca de material"
- Si ADMIN/PROFESOR: botón **"+ Subir material"** → `/material/subir`

### Buscador
- Input: "Buscar por nombre, curso, profesor o tipo…" + botón **"Filtrar"**
- Si hay búsqueda: link **"Limpiar"**

### Grid de archivos (cada card)
- Badge tipo (PDF, MP4, etc.) · Tamaño · Nombre · Descripción
- Metadata: "{curso} · Prof. {nombre}"

| Botón | Roles | Acción |
|-------|-------|--------|
| **"Descargar"** | Todos | GET `/api/backend/content/{id}/download` |
| **"Eliminar"** (rojo) | ADMIN, PROFESOR | DELETE `/api/content/{id}` |

---

## 15. SUBIR MATERIAL

**URL:** `/material/subir?cursoId={id}` · **Roles:** ADMIN, PROFESOR

**Backend:** `GET /api/courses` · `POST /api/backend/content`

### Header
- Link: "← Material" · Eyebrow: "Recursos" · Título: "Subir material"
- Subtítulo: "PDF, videos, audios, documentos Office e imágenes"

### Campos
| Campo | Tipo | Validación |
|-------|------|-----------|
| Curso | select | opciones de `/api/courses`, required; pre-seleccionado si viene `cursoId` |
| Nombre visible | text | 3–150 caracteres, required |
| Archivos | file (multiple) | .pdf .mp4 .mp3 .docx .pptx .xlsx .jpg .jpeg .png |
| Descripción | textarea | 0–500 caracteres |

| Botón | Acción |
|-------|--------|
| **"Subir material"** | POST `/api/backend/content` (FormData) → redirige a `/material` |

---

## 16. CALIFICACIONES

**URL:** `/calificaciones` · **Roles:** ADMIN, PROFESOR, ESTUDIANTE

**Backend:** `GET /api/backend/grades/mine` (ESTUDIANTE) · `GET /api/backend/grades/timeline` (ADMIN/PROFESOR)

### Vista ESTUDIANTE
- Eyebrow: "Mis resultados" · Título: "Mis calificaciones"
- Tabla: Curso · Nota Final (chip verde ≥11, rojo <11, o "Aún no publicadas")

### Vista ADMIN / PROFESOR
- Eyebrow: "Académico" · Título: "Cronograma de calificaciones"
- Tabla dinámica: Alumno (nombre, apellido, email) + columna por curso (chip con nota y estado ✓/✗) + columna "Aprobados" (X/Y)
- Leyenda con chips explicativos

---

## 17. USUARIOS

**URL:** `/usuarios` · **Roles:** ADMIN

**Backend:** `GET /api/backend/users` · `PATCH /api/backend/users/{id}`

### Header
- Eyebrow: "Administración" · Título: "Usuarios"
- Subtítulo: "Cuentas del sistema en formato de edición lineal"

### Buscador
- Input: "Buscar por código, nombre, email, rol o estado..."

### Tabla editable (inline)
Columnas: Código · Apellidos · Nombres · Email · Rol · DNI · Teléfono · Estado · Nueva clave · ""

Cada fila:
- Celdas con inputs/selects editables inline
- Select Rol: Admin / Profesor / Estudiante
- Select Estado: Activo / Inactivo
- Campo "Nueva clave" (password, opcional)
- Botón **"Guardar"** → PATCH `/api/backend/users/{id}`

---

## 18. ESTUDIANTES

**URL:** `/estudiantes` · **Roles:** ADMIN

**Backend:** `GET /api/backend/students` · `POST /api/backend/students` · `PATCH /api/backend/students/{id}` · `DELETE /api/backend/students/{id}` · `POST /api/backend/students/import`

### Header
- Eyebrow: "Administración" · Título: "Registro de estudiantes"
- Subtítulo: "Alta, edición y estado de los alumnos del seminario"

| Botón | Acción |
|-------|--------|
| **"Importar CSV"** | Abre file picker (.csv); campos: CODIGO, NOMBRES, APELLIDOS, MODO, IGLESIA, PAIS, SEM., ANO, DNI, TELEFONO, CORREO, COORD. → POST `.../import` |
| **"+ Nuevo estudiante"** | Despliega formulario de creación |

### Formulario creación
Campos: email* · nombre* · apellido* · código · dni* · teléfono · iglesia · país · coordinador · modo* · semestre ingreso · año ingreso
Nota: "La contraseña inicial del estudiante será su DNI."
Botón **"Crear estudiante"** → POST `/api/backend/students`

### Buscador
- Input + botón **"Buscar"**

### Tabla de estudiantes
Columnas: Cód. · Apellidos · Nombres · Email · Modo · Iglesia · País · S/A · DNI · Teléfono · Coordinador · Estado · ""

| Elemento | Acción |
|----------|--------|
| Botón **"Editar"** | Expande fila con formulario inline |
| Botón **"Guardar"** (en edición) | PATCH `/api/backend/students/{id}` |
| Botón **"Cancelar"** (en edición) | Colapsa sin guardar |
| Botón **"Eliminar"** (rojo) | DELETE `/api/backend/students/{id}` (con confirmación) |

---

## 19. PROFESORES

**URL:** `/profesores` · **Roles:** ADMIN

**Backend:** `GET /api/backend/users` (filtrado por PROFESOR) · `POST /api/backend/users` · `PATCH /api/backend/users/{id}` · `DELETE /api/backend/users/{id}`

### Header
- Eyebrow: "Administración" · Título: "Registro de profesores"

| Botón | Acción |
|-------|--------|
| **"Importar CSV"** | Mismo patrón que estudiantes |
| **"+ Nuevo profesor"** | Despliega formulario |

### Formulario creación
Campos: email* · nombre* · apellido* · código · dni* · teléfono
Nota: "La contraseña inicial del profesor será su DNI."
Botón **"Crear profesor"** → POST `/api/backend/users`

### Buscador
Input: "Buscar por código, nombre, correo o DNI…"

### Tabla
Columnas: Cód. · Apellidos · Nombres · Email · DNI · Teléfono · Estado · ""

| Elemento | Acción |
|----------|--------|
| Botón **"Editar"** | Fila inline editable |
| Botón **"Guardar"** | PATCH `/api/backend/users/{id}` |
| Botón **"Eliminar"** (rojo) | DELETE `/api/backend/users/{id}` |

---

## 20. SUSTITUTORIOS

**URL:** `/sustitutorios` · **Roles:** ADMIN

**Backend:** `GET /api/backend/exams` · `GET /api/backend/substitutions/eligible` · `GET /api/backend/exams/{id}/results` · `PATCH /api/backend/exams/{id}/grade-open` · `PATCH /api/backend/exams/{id}/submissions/{submissionId}/review`

### Header
- Eyebrow: "Administración" · Título: "Exámenes Sustitutorios"
- Subtítulo: "Gestiona exámenes de recuperación y califica los envíos."

### Tabs
| Tab | Contenido |
|-----|-----------|
| Exámenes | Lista y calificación de envíos |
| Alumnos elegibles | Estudiantes sin examen rendido |

---

### Tab: EXÁMENES — Layout dos columnas

**Sidebar izquierdo:**
- Título: "{count} examen(es) sustitutorio(s)"
- Botón **"+ Crear"** → `/exams/create`
- Lista de botones (uno por examen): nombre · "{curso} · {count} envío(s)" · badge rojo si no publicado

**Panel principal (al seleccionar examen):**
- Título: "{titulo} — {count} envío(s)"
- Cada envío (card):
  - **Header:** Nombre del estudiante · Email · Fecha/hora · Badge "{puntos} pts" · "✓ Todo calificado" si aplica
  - **Body:** Por cada respuesta:
    - Título de pregunta · Respuesta (preformatted) · Input número "Nota (0–{maxPuntos}):" · Texto verde "Guardado: {nota}" si ya calificada
  - **Footer:**
    - Botón **"Guardar calificación"** → PATCH `/api/backend/exams/{id}/grade-open`
    - Botón **"Marcar como revisado"** (disabled hasta que todas estén calificadas) → PATCH `.../submissions/{submissionId}/review` → muestra `notaExamenRecup`
    - Mensaje de feedback (verde si éxito, rojo si error)

---

### Tab: ALUMNOS ELEGIBLES
- Título: "Alumnos elegibles ({count})"
- Lista: nombre · email · badge rojo "{count} curso(s) jalado(s)"
- Empty state si no hay elegibles

---

## 21. CONFIGURACIÓN

**URL:** `/configuracion` · **Roles:** ADMIN

**Backend:** `GET /api/backend/config/zoom` · `PATCH /api/backend/config/zoom` · `GET /api/backend/health/ready`

### Header
- Eyebrow: "Administración" · Título: "Configuración"
- Subtítulo: "Ajustes globales del ciclo académico"

### Card: Estado de Servicios
- Pill global: "Listo" (verde) / "Pendiente" (amarillo)
- Definition list: nombre servicio → estado (pill) + mensaje

### Card: Enlace Zoom del ciclo
- Descripción: "Este enlace es único para todo el ciclo. Todos los roles lo ven en la pantalla del curso."

| Campo | Tipo |
|-------|------|
| URL de la reunión Zoom | url, required |

| Botón | Acción |
|-------|--------|
| **"Guardar enlace"** | PATCH `/api/backend/config/zoom` |
| **"Probar enlace"** | Abre URL en nueva pestaña (si hay URL guardada) |

---

## MAPA DE NAVEGACIÓN

```
/login
  ├── /forgot-password → /login
  ├── /reset-password?token → /login
  └── [autenticado] → /inicio

/inicio
  ├── /cursos
  ├── /calificaciones
  ├── /usuarios        (ADMIN)
  ├── /profesores      (ADMIN)
  ├── /sustitutorios   (ADMIN)
  ├── /configuracion   (ADMIN)
  └── /exams

/cursos
  └── /cursos/[id]
        ├── /material/subir?cursoId=[id]
        ├── /exams/create?cursoId=[id]
        ├── /exams/[id]
        ├── /exams/[id]/results
        └── /cursos/[id]/notas
              └── (grilla editable)

/exams
  ├── /exams/create
  ├── /exams/[id]
  │     └── /exams/[id]/results?studentId=[id]
  └── /exams/[id]/results
        └── /exams/[id]/results?studentId=[id]

/material
  └── /material/subir

/sustitutorios
  └── /exams/create (botón "+ Crear")
```

---

## RESUMEN DE ENDPOINTS BACKEND

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/api/auth/signin` | Login (next-auth) |
| POST | `/api/password/forgot` | Solicitar reset |
| POST | `/api/password/reset` | Aplicar nueva contraseña |
| GET | `/api/courses` | Lista cursos (server) |
| GET/POST | `/api/backend/courses` | Listar / crear curso |
| GET/DELETE | `/api/backend/courses/{id}` | Ver / eliminar curso |
| GET | `/api/backend/courses/{id}/sessions` | Sesiones del curso |
| POST | `/api/backend/courses/{id}/sessions` | Crear sesión |
| GET | `/api/backend/courses/{id}/grades` | Notas publicadas |
| GET/POST | `/api/backend/courses/{id}/grades-sheet` | Ver / guardar grilla |
| POST | `/api/backend/courses/{id}/grades/publish` | Publicar notas |
| GET/PATCH | `/api/backend/sessions/{id}` | Ver / actualizar sesión |
| POST | `/api/backend/sessions/{id}/attendance` | Guardar asistencia |
| POST | `/api/backend/sessions/{id}/summaries/self-upload` | Subir resumen |
| PATCH | `/api/backend/summaries/{id}/review` | Marcar resumen revisado |
| GET | `/api/exams` | Lista exámenes (server) |
| GET/POST | `/api/backend/exams` | Listar / crear examen |
| GET | `/api/backend/exams/{id}` | Detalle examen |
| PATCH | `/api/backend/exams/{id}/publish` | Publicar examen |
| POST | `/api/backend/exams/{id}/submit` | Enviar respuestas |
| GET | `/api/backend/exams/{id}/results` | Resultados |
| PATCH | `/api/backend/exams/{id}/grade-open` | Calificar respuestas abiertas |
| PATCH | `/api/backend/exams/{id}/submissions/{submissionId}/review` | Marcar revisado → escribe `notaExamenRecup` |
| GET/POST | `/api/backend/content` | Listar / subir material |
| DELETE | `/api/backend/content/{id}` | Eliminar material |
| GET | `/api/backend/content/{id}/download` | Descargar archivo |
| GET/POST | `/api/backend/users` | Listar / crear usuario |
| PATCH/DELETE | `/api/backend/users/{id}` | Editar / eliminar usuario |
| GET/POST | `/api/backend/students` | Listar / crear estudiante |
| PATCH/DELETE | `/api/backend/students/{id}` | Editar / eliminar estudiante |
| POST | `/api/backend/students/import` | Importar desde CSV |
| GET | `/api/backend/grades/mine` | Mis notas (ESTUDIANTE) |
| GET | `/api/backend/grades/timeline` | Timeline notas (ADMIN/PROF) |
| GET | `/api/backend/substitutions/eligible` | Elegibles sustitutorio |
| GET/PATCH | `/api/backend/config/zoom` | Ver / guardar enlace Zoom |
| GET | `/api/backend/health/ready` | Estado de servicios |
