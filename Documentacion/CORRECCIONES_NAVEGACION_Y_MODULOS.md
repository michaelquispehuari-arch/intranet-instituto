# Correcciones de navegación y módulos (las 3 cuentas)

> **Contiene:** la regla "una sola forma de llegar a cada pantalla" (módulos por-curso solo dentro del workspace del curso, nunca sueltos en el sidebar), el mapa final de sidebar/pestañas por rol, y reglas puntuales de Exámenes/Alumnos/registro de Profesores. Leer antes de agregar un ítem al sidebar o una ruta nueva.

Fecha: 2026-06-16
Base: revisar DOCUMENTACION_CONSOLIDADA_AVANCE_ACTUAL.md y DOCUMENTACION_AVANCE_VALIDACION_ACTUAL.md.
Objetivo: quitar la ambigüedad de navegación y corregir Sesiones, Exámenes, Alumnos y el registro de Profesores.

---

## 0. CORRECCIÓN PRINCIPAL: una sola forma de llegar a cada pantalla

```text
PROBLEMA: el ítem del sidebar (ej. "Exámenes") y la pestaña del curso ("Exámenes" dentro del curso)
llevan a la MISMA pantalla global. Hay dos caminos al mismo lugar. Pasa en casi todas las secciones
dentro de Cursos, en las 3 cuentas, y se vuelve confuso.

PRINCIPIO (la regla que lo resuelve):
- Todo lo que pertenece a un curso (Sesiones, Material, Exámenes, Alumnos, Notas del curso)
  se accede ÚNICAMENTE desde el workspace de ESE curso, en pestañas, con el contenido filtrado al curso.
- El sidebar SOLO tiene destinos globales (no por curso).
- Se eliminan del sidebar los ítems por-curso (Sesiones, Material, Exámenes y cualquier "Alumnos" global):
  pasan a ser SOLO pestañas dentro del curso.
- Resultado: una sola entrada a los exámenes de un curso = dentro del curso. Cero ambigüedad.

SIDEBAR DESPUÉS DE LA CORRECCIÓN
  ADMIN:      Inicio | Cursos | Calificaciones | Estudiantes | Profesores | Sustitutorios | Configuración
  PROFESOR:   Inicio | Mi curso | Calificaciones (sus cursos)
  ESTUDIANTE: Inicio | Mi curso | Mis notas

PESTAÑAS DENTRO DEL CURSO (workspace, contenido filtrado al curso)
  ADMIN:      Resumen | Sesiones | Material | Exámenes | Alumnos | Notas
  PROFESOR:   Sesiones (solo ver) | Material | Alumnos (solo ver)
  ESTUDIANTE: Clases/Sesiones (solo ver) | Material | Examen | Mis transcripciones | Alumnos (solo ver)

- Ninguna pestaña del curso debe redirigir a una sección global: muestra el contenido del curso ahí mismo.
- Verificar que TODOS los enlaces apunten al destino correcto (sin saltar a una pantalla suelta).
```

---

## 1. Sesiones = solo clases grabadas (YouTube)

```text
- En Sesiones NO se programan clases. La clase EN VIVO se entra por el botón de Zoom (ya existe).
- Sesiones = lista de clases GRABADAS: por cada clase se coloca el link de YouTube de su grabación.
- ADMIN: sube y edita los links de grabación de cada clase.
- PROFESOR y ESTUDIANTE: solo VEN las sesiones y sus links. No editan.
- Quitar cualquier texto/acción de "programar clase" o "semana actual de clases" que sugiera agendar.
```

---

## 2. Exámenes — cuenta ADMIN (creación y configuración)

```text
PUNTAJE DE PREGUNTAS
- Bug: el "0" del campo de puntaje no se borra al escribir un dígito (queda pegado, ej. "05").
- Arreglo: al teclear, el dígito REEMPLAZA el 0. (Campo numérico controlado: limpiar el 0 inicial /
  seleccionar el contenido al enfocar; guardar como número, no como texto con cero a la izquierda.)

FECHA Y HORA
- Validar día, mes, año y hora correctamente (fechas válidas; no permitir fechas/horas imposibles).
- El examen tiene: disponibleDesde (inicio) y disponibleHasta (fin). Validar disponibleHasta > disponibleDesde.

VENTANA DE ACCESO Y DURACIÓN
- El alumno SOLO puede acceder al examen entre disponibleDesde y disponibleHasta.
- La DURACIÓN se cuenta desde que el alumno pulsa "Iniciar examen" (guardar iniciadoEn).
- Fin efectivo para ese alumno = el menor entre (iniciadoEn + duracionMinutos) y disponibleHasta.
- Al llegar ese fin, el examen se cierra/auto-envía.
- TODO esto se valida en el BACKEND (autoridad), no solo en el frontend.
```

---

## 3. Exámenes — cuenta ESTUDIANTE

```text
- Puede rendir SOLO dentro de la fecha/hora permitida (sección 2). Fuera de la ventana: mensaje claro, sin acceso.
- Si sale del examen, puede reingresar mientras no expire su tiempo (progreso en Redis).
- Al cerrar el plazo y con revelarRespuestas activo: ve su nota y las respuestas correctas.
- La NOTA del examen va AUTOMÁTICAMENTE al registro de notas de la cuenta ADMIN (la grilla donde se calcula todo):
    examen normal     -> notaExamenNorm
    examen sustitutorio-> notaExamenRecup
  (ver REGISTRO_Y_CALCULO_NOTAS.md, secciones 5 y 6).
- Verificar que todas las direcciones/enlaces estén bien conectados.
```

---

## 4. Alumnos = lista de solo lectura, con el diseño del shell

```text
- Quitar "Gestión de Matrículas" y "Gestión de cursos" y sus redirecciones:
  la matrícula y la creación/edición de cursos ya se hacen en la sección CURSOS. No duplicar.
- La pantalla Alumnos solo muestra la LISTA de alumnos inscritos del curso, NO modificable.
- Aplica a las 3 cuentas.
- En PROFESOR y ESTUDIANTE, además, la pantalla de Alumnos hoy usa un diseño distinto:
  debe usar el diseño del shell (sidebar + tokens), igual que el resto.
```

---

## 5. Registro de ESTUDIANTES y PROFESORES (mismo estilo)

```text
- El registro de PROFESORES debe hacerse IGUAL que el de ESTUDIANTES:
  tabla editable estilo Excel, mismo diseño/UX, edición por celda, búsqueda/filtro por código.
- Reutilizar el patrón de REGISTRO_Y_CALCULO_NOTAS.md (sección 1) para profesores,
  con los campos propios del profesor (sin los campos académicos del alumno si no aplican).
- Ambos registros viven en el sidebar del ADMIN: "Estudiantes" y "Profesores".
```

---

## 6. Qué ve cada cuenta tras la corrección (resumen)

```text
ADMIN
  Sidebar: Inicio, Cursos, Calificaciones, Estudiantes, Profesores, Sustitutorios, Configuración.
  En un curso: Resumen, Sesiones (edita links YouTube), Material, Exámenes (crea/configura), Alumnos (solo ver), Notas.

PROFESOR
  Sidebar: Inicio, Mi curso, Calificaciones (sus cursos).
  En Mi curso: Sesiones (solo ver grabaciones), Material, Alumnos (solo ver). Botón de Zoom para la clase en vivo.

ESTUDIANTE
  Sidebar: Inicio, Mi curso, Mis notas.
  En Mi curso: Clases/Sesiones (solo ver grabaciones y links), Material, Examen (rendir en su horario),
               Mis transcripciones, Alumnos (solo ver). Botón de Zoom para la clase en vivo.
```

---

## 7. Hecho cuando

```text
[ ] Ningún módulo por-curso (Sesiones, Material, Exámenes, Alumnos) aparece como ítem suelto del sidebar.
[ ] Esos módulos solo se abren dentro del curso, con su contenido filtrado a ese curso, sin redirigir a una sección global.
[ ] Hay una sola forma de llegar a cada pantalla; ya no es ambiguo en ninguna de las 3 cuentas.
[ ] Sesiones solo sube/muestra links de YouTube de clases grabadas; nada de "programar clase". Profesor/alumno solo ven.
[ ] El puntaje de pregunta ya no deja el 0 pegado al escribir.
[ ] La ventana de acceso del examen valida día/mes/año/hora; la duración corre desde "Iniciar examen".
[ ] La nota del examen llega sola al registro de notas del admin (Norm/Recup).
[ ] Alumnos es lista de solo lectura, con el diseño del shell, sin botones de matrícula/gestión de cursos.
[ ] Profesores se registran igual que Estudiantes.
[ ] backend y frontend: typecheck + build OK.
```
