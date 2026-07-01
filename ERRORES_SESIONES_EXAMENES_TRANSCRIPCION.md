# Errores: Sesiones, Exámenes y Transcripción

Fecha: 2026-06-16
Objetivo: arreglar el guardado de sesiones, reestructurar el tiempo del examen y conectar la subida de
transcripción del alumno con el cálculo automático de notas YA existente (sin crear variables nuevas).

---

## 1. Sesiones: no guarda el link de YouTube ("datos inválidos")

```text
SÍNTOMA: en Sesiones (admin o profesor) se coloca link de YouTube + título + hora y no guarda;
         responde "datos inválidos".
CAUSA: error de validación (Zod) en el endpoint de crear/editar sesión. El formulario y el schema no coinciden.

ARREGLO (revisar el schema de sesión vs lo que envía el formulario):
- titulo: string requerido.
- enlaceGrabacion: validar como URL; aceptar youtube.com y youtu.be; NO exigir otro formato.
- fecha / hora: enviar como DateTime ISO válido. Si el form manda solo la hora o un texto suelto,
  convertir a ISO antes de enviarlo (o ajustar el schema para que lo acepte y lo normalice).
- orden: si el schema lo exige y el form no lo envía, hacerlo opcional con valor por defecto.
- Los NOMBRES de los campos deben coincidir EXACTO entre: formulario -> proxy de Next -> schema del backend.
- Devolver el error de campo específico (qué campo falló y por qué), no un "datos inválidos" genérico.

PERMISOS (recordatorio del diseño acordado):
- ADMIN sube y edita los links de grabación.
- PROFESOR solo VE las sesiones (no edita). Si el form de subida aparece para profesor, ocultarlo.
```

---

## 2. Exámenes: reestructurar el modelo de tiempo

Un solo reloj maestro que arranca en la hora de inicio. Ver la línea de tiempo de ejemplo.

```text
CAMPOS DEL EXAMEN
  disponibleDesde   DateTime   hora de inicio = cuando se HABILITA el examen.
  duracionMinutos   Int        duración (ej. 30). Define el CIERRE.
  ingresoHastaMin   Int        minutos tras el inicio en que aún se puede ENTRAR (ej. 10). Debe ser < duracionMinutos.

DERIVADOS (se calculan, no se guardan)
  ingresoHasta = disponibleDesde + ingresoHastaMin     -> hasta qué hora se puede ENTRAR
  cierre       = disponibleDesde + duracionMinutos      -> cuándo se CIERRA para todos

REGLAS
- Crear examen: validar día/mes/año/hora reales; exigir 1 <= ingresoHastaMin < duracionMinutos.
- El alumno solo puede INICIAR el examen si la hora actual está entre disponibleDesde e ingresoHasta.
  Fuera de esa ventana: mensaje claro, sin acceso.
- Al iniciar, guardar iniciadoEn. El reloj del alumno es una CUENTA REGRESIVA hasta 'cierre'
  (no hasta iniciadoEn + duración). Por eso, quien entra tarde tiene menos tiempo.
- A la hora 'cierre' el examen se cierra / auto-envía para todos.
- RESULTADOS: visibles SOLO después de 'cierre', AUNQUE el alumno haya terminado antes.
  Antes de 'cierre' mostrar: "Resultado disponible a partir de las HH:MM" (la hora de cierre).
- TODO esto se valida en el BACKEND (autoridad), no solo en el frontend.

EJEMPLO (confirmar que es así)
  inicio 7:00, duración 30 min, ingresoHastaMin 10:
    - se puede entrar entre 7:00 y 7:10
    - el examen cierra para todos a las 7:30
    - quien entra 7:10 tiene 20 min
    - el resultado recién se ve a las 7:30, aunque alguien acabe a las 7:15

(Esto reemplaza la nota anterior de "la duración cuenta desde que inicia": ahora el cierre es global,
 definido por disponibleDesde + duracionMinutos.)
```

---

## 3. Alumnos: subir transcripción por día, enlazada al cálculo YA existente

```text
QUÉ FALTA
- En la vista del ALUMNO (dentro de su curso) debe existir "Subir mi transcripción".
- Al subir, el alumno SELECCIONA el día: Día 1 / Día 2 / Día 3 del curso (= la sesión correspondiente).
- ADMIN y PROFESOR ven lo que el alumno subió y le colocan la NOTA (NT).
- La NT NO es visible para el alumno (solo ve que entregó / que fue revisado).

REGLA CRÍTICA: NO crear variables nuevas. Reutilizar lo que YA existe y que ya estaba enlazado al cálculo.
- La transcripción es EntregaResumen, con:
    sesionId          -> el día (Día 1/2/3 = sesión 1/2/3 del curso)
    notaTranscripcion -> la NT que pone el revisor (0 a 18)
- La NT de cada día alimenta la columna NT de ese día en la grilla y la fórmula de asistencia
  (NOTA_ASISTENCIA_13: la NT del día va a row[4] / row[8] / row[12]).
- Buscar en el código la variable/campo de NT que YA estaba incluida en el cálculo automático
  y conectar ahí la subida del alumno + la nota del revisor. NO duplicar con un campo nuevo.

VERIFICAR
- Que "Día 1/2/3" mapea a la sesión correcta del curso seleccionado.
- Que la NT puesta por el revisor llega de verdad a la fórmula (probar: subir transcripción día 1,
  poner NT, y ver que cambia la nota de asistencia del alumno en la grilla del admin).
- Que el endpoint que sirve datos al ESTUDIANTE NO devuelve notaTranscripcion.
```

---

## 4. Hecho cuando

```text
[ ] Una sesión guarda link de YouTube + título + fecha/hora sin "datos inválidos".
[ ] El profesor solo ve sesiones (no edita); el admin sí edita.
[ ] El examen respeta: ventana de ingreso (disponibleDesde..ingresoHasta) y cierre global (disponibleDesde+duración).
[ ] El reloj del alumno cuenta hasta el cierre; quien entra tarde tiene menos tiempo.
[ ] El resultado solo se ve tras el cierre; antes muestra "Resultado disponible a partir de HH:MM".
[ ] El alumno sube su transcripción eligiendo Día 1/2/3; el revisor pone NT oculta para el alumno.
[ ] La NT usa la variable EXISTENTE del cálculo (EntregaResumen.notaTranscripcion) y mueve la nota de asistencia.
[ ] backend y frontend: typecheck + build OK.
```
