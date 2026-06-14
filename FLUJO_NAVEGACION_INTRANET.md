# Flujo de navegación y shell único — Intranet Educativa

Fecha: 2026-06-14
Propósito: corregir el flujo para que TODAS las pantallas vivan en una sola estructura (sidebar) y cada rol entre a su pantalla correcta. Hoy conviven dos layouts y eso hace que al pulsar "Inicio" se salga del sidebar y se vea parchado.

---

## 1. El problema actual (qué se ve hoy)

```text
- Hay DOS layouts distintos:
    /dashboard  -> página suelta, con su propio header y 4 tarjetas, SIN sidebar.
    /cursos, /calificaciones, ... -> shell nuevo con sidebar verde.
- Al pulsar "Inicio" se va a /dashboard (sin sidebar) -> parece que sales de la app.
- El home de admin son 4 tarjetas que DUPLICAN el sidebar (y le faltan Exámenes, Material, Sustitutorios).
- En Cursos, el admin ve "Sin cursos asignados / No hay cursos disponibles para tu rol"
    (texto de alumno/profesor). El admin debe ver TODOS los cursos.
- Hay un botón aparte "Gestión completa de cursos" que sugiere otra pantalla duplicada.
```

---

## 2. Regla principal: un solo shell

```text
- Crear UN layout de aplicación (route group (app)/layout.tsx) que renderice sidebar + topbar.
- TODAS las pantallas autenticadas viven dentro de ese layout.
- Eliminar el layout viejo de /dashboard (header propio + 4 tarjetas sueltas).
- El sidebar y el topbar NUNCA desaparecen al navegar entre módulos.
- El botón "Salir" / "Cerrar sesión" vive solo en el shell (pie del sidebar), no repetido en headers sueltos.
```

---

## 3. Entrada por rol (a dónde cae cada quien al iniciar sesión)

Tras el login -> redirige a `/inicio`. El contenido de `/inicio` depende del rol, pero SIEMPRE dentro del shell.

```text
ADMIN -> /inicio = RESUMEN (no 4 tarjetas que duplican el menú)
   - Tarjetas de resumen: cursos activos, total de alumnos,
     pendientes de revisar (resúmenes por revisar, exámenes por calificar).
   - Accesos rápidos a lo más usado.
   Sidebar admin: Inicio, Cursos, Calificaciones, Exámenes, Material, Usuarios, Sustitutorios, Configuración.

PROFESOR -> /inicio = SU CURSO DE LA SEMANA
   - Tarjeta del curso asignado + botón Zoom. Si no tiene curso, estado vacío claro.
   Sidebar profesor: Inicio, Mi curso, Calificaciones (solo sus cursos), Material.
   (No ve Usuarios, Sustitutorios ni Configuración.)

ESTUDIANTE -> /inicio = SU CURSO ACTIVO
   - Botón Zoom grande + accesos a Material, Examen, Mis resúmenes.
   Sidebar estudiante: Inicio, Mi curso, Mis notas.
```

El sidebar muestra solo los ítems del rol (filtrado en el componente del sidebar, no rutas distintas).

---

## 4. Reglas de redirección

```text
/                          sin sesión -> /login | con sesión -> /inicio
login correcto             -> /inicio (según rol)
/dashboard (ruta vieja)    -> redirigir a /inicio (o renombrar la ruta a /inicio)
ruta no permitida al rol   estando logueado -> /inicio  (NO /login)
sin sesión en ruta privada -> /login
"Inicio" del sidebar       -> /inicio (dentro del shell), nunca a la pantalla suelta de 4 tarjetas
```

---

## 5. Arreglos puntuales de consistencia

```text
- Cursos (admin): mostrar TODOS los cursos directamente (crear, editar, asignar profesor, matricular).
    Corregir el texto "No hay cursos disponibles para tu rol".
    Vacío para admin: "Aún no hay cursos. Crear el primero."
- Quitar el botón separado "Gestión completa de cursos": la página /cursos YA ES la gestión del admin.
    No deben existir dos pantallas de cursos.
- Nombres unificados: el módulo se llama igual en sidebar, título de página y ruta
    (ej. "Cursos" en todos lados; no "Cursos" + "Gestión de cursos").
- Estados vacíos redactados según el rol y la acción siguiente, no genéricos.
- Un solo encabezado por pantalla (el topbar del shell); quitar headers sueltos heredados del layout viejo.
```

---

## 6. Mapa de rutas final (todas bajo el shell)

```text
(app)/
  inicio                       landing por rol (resumen admin | su curso profesor/estudiante)
  cursos                       lista + gestión (admin)
    cursos/[id]                workspace del curso (pestañas)
    cursos/[id]/sesiones/[sesionId]   detalle de sesión
  calificaciones               cronograma (alcance según rol)
  examenes
    examenes/create            profesor/admin
    examenes/[id]              rendir
    examenes/[id]/resultados
  material
  usuarios                     solo admin
  sustitutorios                solo admin
  configuracion                solo admin (enlace Zoom)
(auth)/
  login | forgot-password | reset-password
privacy                        público
```

---

## 7. Criterio de "hecho"

```text
[ ] Inicias sesión con cada rol y caes en SU /inicio, con el sidebar visible.
[ ] Navegas a cualquier módulo y el sidebar/topbar permanece (nunca aparece el layout viejo).
[ ] "Inicio" del sidebar lleva al resumen del rol, no a las 4 tarjetas sueltas.
[ ] El admin ve todos los cursos; los textos de estado vacío corresponden al rol.
[ ] No hay rutas que "saquen" del shell ni botones que dupliquen pantallas.
[ ] /dashboard ya no existe como pantalla suelta (redirige a /inicio).
```
