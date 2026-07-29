# Registro de estudiantes y cálculo de notas (RTS Perú)

> **Contiene:** la fórmula real y exacta de la nota de asistencia (símbolos F/A/M/C/T/J, modos SINCRONICO/ASINCRONICO/MIXTO), de dónde salen la NT (transcripción) y la nota de examen (automáticas, nunca a mano), la fórmula de la nota final (entera, truncada), y las columnas del registro de estudiantes. **Leer siempre antes de tocar cualquier cosa relacionada a notas/calificaciones/asistencia** — la fórmula es específica y fácil de romper sin darse cuenta.

Fecha: 2026-06-16
Propósito: definir el registro real de estudiantes y el cálculo real de la nota semanal del seminario.
ESTO REEMPLAZA el enfoque placeholder de asistencia del documento de contexto.

Decisiones cerradas con el cliente:
```text
- La NOTA FINAL siempre es ENTERA (truncada hacia abajo), obedeciendo la fórmula.
- La NOTA DE EXAMEN se trae automáticamente del módulo de exámenes (no se digita a mano).
- La NT (Nota de Transcripción) sale de la nota que el revisor le pone a la transcripción del alumno;
  NO es visible para el alumno y se trae sola a la columna NT del día.
```

---

## 1. Registro de estudiantes (estilo Excel)

Tabla editable con estas columnas EXACTAS. Solo MODO entra al cálculo de notas; el resto es información.

```text
CÓDIGO | NOMBRES | APELLIDOS | MODO | IGLESIA | PAÍS | SEM. | AÑO | DNI | TELÉFONO | FECHA DE NACIMIENTO | CORREO | ACTIVO | COORD.
```

```text
- CÓDIGO: identificador único del estudiante (se usa para buscar/filtrar). Único en la base.
- MODO: SINCRONICO | ASINCRONICO | MIXTO. ÚNICO campo que afecta el cálculo.
- SEM. y AÑO: semestre y año de ingreso al seminario.
- ACTIVO: A = activo, I = inactivo (se mapea a boolean activo).
- El resto (iglesia, país, dni, teléfono, fecha nac., correo, coord.) es información de contacto.

Funcionalidades:
- Edición tipo celda (registrar/editar como en Excel), guardado por fila.
- Búsqueda / filtro por CÓDIGO para ver un estudiante en particular (también por nombre).
- La lista siempre se muestra ordenada alfabéticamente por APELLIDO y luego NOMBRE
  (`orderBy: [{ apellido: "asc" }, { nombre: "asc" }]` en `listStudents`,
  `backend/src/services/student.service.ts`). Lo mismo aplica a la lista de profesores
  y a la sección "Alumnos" dentro de cada curso (ordenadas en el frontend).
- IMPORTACIÓN CSV: el orden de columnas NO importa — el encabezado se reconoce por palabra clave
  (ej. "Dirección de correo electrónico" se detecta igual que "Correo"), ver `matchHeader` en
  `frontend/src/lib/csv.ts`. Solo CORREO, NOMBRES y APELLIDOS son obligatorios; DNI es OPCIONAL
  (si falta, la cuenta se crea con una contraseña provisional y el usuario la define con
  "olvidé mi contraseña", ver `backend/src/utils/random-password.ts`). Al importar:
  nombre/apellido/iglesia/país/coordinador se pasan a Primera Letra Mayúscula (`toTitleCase`),
  el teléfono recibe el prefijo del país si no lo tiene ya (`applyPhonePrefix`), y las fechas de
  nacimiento aceptan varios formatos sueltos (`parseFlexibleDate`), no solo dd/mm/aaaa.
  Validar duplicados por CÓDIGO, por CORREO y por DNI.
- Alta manual de un estudiante (formulario "Agregar"): valida duplicados por CORREO, CÓDIGO y DNI
  ANTES de crear, igual que la importación CSV (`createStudent` en `backend/src/services/student.service.ts`).
  Si ya existe, devuelve 400 con mensaje claro ("Ya existe un usuario con ese correo" /
  "...con ese código" / "...con ese DNI") en vez de un error 500 de restricción única de la base de datos.
  El chequeo de DNI es por `rol: ESTUDIANTE` (no bloquea si un profesor coincide por DNI).
- Solo ADMIN gestiona el registro.
```

---

## 2. Modelo de datos

### 2.1 Extender Usuario con los campos del registro

```prisma
enum ModoEstudio {
  SINCRONICO
  ASINCRONICO
  MIXTO
}

model Usuario {
  // ...campos actuales (email, passwordHash, nombre, apellido, rol, activo)...
  codigo          String?     @unique
  modo            ModoEstudio @default(SINCRONICO)  // afecta el cálculo
  iglesia         String?
  pais            String?
  semestreIngreso Int?
  anioIngreso     Int?
  dni             String?
  telefono        String?
  fechaNacimiento DateTime?
  coordinador     String?
}
```

### 2.2 Registro semanal de notas (una fila por estudiante y curso)

```prisma
model RegistroSemanal {
  id              String   @id @default(cuid())
  estudianteId    String
  cursoId         String
  modo            ModoEstudio                 // snapshot; por defecto el del estudiante, editable
  numDias         Int      @default(3)        // 1, 2 o 3 días de clase esa semana
  celdas          Json     // 12 celdas: d1c1,d1c2,d1c3,d1NT, d2c1,d2c2,d2c3,d2NT, d3c1,d3c2,d3c3,d3NT
  notaAsistencia  Float?   // CALCULADA por el backend
  notaExamenNorm  Float?   // AUTO: del envío de examen normal
  notaExamenRecup Float?   // AUTO: del envío de examen sustitutorio
  notaFinal       Float?   // CALCULADA por el backend (entera)
  actualizadoEn   DateTime @updatedAt

  estudiante Usuario @relation(fields: [estudianteId], references: [id])
  curso      Curso   @relation(fields: [cursoId], references: [id])

  @@unique([estudianteId, cursoId])
}
```

> Las celdas NT NO se digitan a mano en la grilla: se traen de la transcripción (sección 4).
> notaExamenNorm / notaExamenRecup tampoco se digitan: se traen del módulo de exámenes (sección 5).

---

## 3. Cálculo de la NOTA DE ASISTENCIA (fórmula oficial, se porta al BACKEND)

Símbolos y penalizaciones (el código es la autoridad; la leyenda dice "F resta 6.7", el cálculo usa 6.67):

```text
F  Falta / ausencia        -6.67
A  Cámara apagada          -5
M  Cámara mal enfocada     -4
C  Código mal digitado     -2
T  Tardanza                -2
(vacío)                     0
NT Nota de Transcripción (máx. 18)
J  sufijo "J" = justificada -> prorratea el descuento según el NT del día
```

Reglas especiales:
- ASINCRONICO: la nota del día se basa solo en el NT del día -> valor por cámara = (NT_dia - 20) / 3.
- MIXTO: si un día tiene 3 "F", ese día se evalúa por su NT (si no hay NT válido, -6.67 por cámara).
- Justificada (símbolo termina en J): valor = valor * (20 - NT_dia) / 20.

Implementación de referencia para el backend (TypeScript). `row` tiene 13 posiciones:
[tipoClase, d1c1, d1c2, d1c3, d1NT, d2c1, d2c2, d2c3, d2NT, d3c1, d3c2, d3c3, d3NT].

```ts
type Celda = string | number;

export function notaAsistencia13(row: Celda[], numDias: 1 | 2 | 3): number {
  const tipoClase = normalizar(String(row[0]));
  const valores = new Array(9).fill(0);
  const countF = [0, 0, 0];

  for (let j = 1; j <= 9; j++) {
    const simboloOriginal = obtenerSimbolo(row, j);
    const t = obtenerTranscripcion(row, j, simboloOriginal);
    const simbolo = t.simbolo;
    valores[j - 1] = calcularValor(simbolo, t.valor, tipoClase, row, j);

    if (tipoClase === "MIXTO") {
      const dia = Math.ceil(j / 3);
      if (normalizar(simbolo) === "F") countF[dia - 1]++;
      if (countF[dia - 1] === 3) {
        const nt = dia === 1 ? row[4] : dia === 2 ? row[8] : row[12];
        const val = esNumeroValido(nt) ? (Number(nt) - 20) / 3 : -6.67;
        const start = (dia - 1) * 3;
        for (let k = start; k < start + 3; k++) valores[k] = val;
      }
    }
  }

  const total = valores.reduce((a, c) => a + c, 0);
  let nota = 20 + total / numDias;
  nota = Math.max(0, Math.min(20, nota));
  return Math.round(nota * 10) / 10;
}

function obtenerSimbolo(row: Celda[], j: number): string {
  const idx = j <= 3 ? j : j <= 6 ? j + 1 : j + 2;
  return limpiar(row[idx]);
}

function obtenerTranscripcion(row: Celda[], j: number, simbolo: string) {
  let s = limpiar(simbolo);
  if (!s || !s.toUpperCase().endsWith("J")) return { simbolo: s, valor: 0 };
  s = s.slice(0, -1);
  const idx = j <= 3 ? 4 : j <= 6 ? 8 : 12;
  return { simbolo: s, valor: esNumeroValido(row[idx]) ? Number(row[idx]) : 0 };
}

function calcularValor(simbolo: string, transcripcion: number, tipoClase: string, row: Celda[], j: number): number {
  if (tipoClase === "ASINCRONICO") {
    const idx = j <= 3 ? 4 : j <= 6 ? 8 : 12;
    const v = esNumeroValido(row[idx]) ? Number(row[idx]) : 0;
    return (v - 20) / 3;
  }
  const s = normalizar(simbolo);
  let valor = 0;
  switch (s) {
    case "F": valor = -6.67; break;
    case "A": valor = -5; break;
    case "M": valor = -4; break;
    case "C":
    case "T": valor = -2; break;
    default: valor = 0;
  }
  if (transcripcion > 0 && transcripcion <= 20) {
    valor = valor * (20 - transcripcion) / 20;
  }
  return valor;
}

function esNumeroValido(v: Celda): boolean {
  return v !== "" && v !== null && v !== undefined && !isNaN(Number(v));
}
function limpiar(v: Celda): string {
  return v === null || v === undefined ? "" : String(v).trim();
}
function normalizar(v: Celda): string {
  return limpiar(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
```

El backend arma `row` así: `[modo, ...celdas]`, donde las celdas NT ya vienen de la transcripción (sección 4).
El frontend calcula la nota SOLO para la vista previa en vivo (sección 7); lo que se guarda en la base
de datos siempre lo calcula el backend al recibir el POST de `/grades-sheet`.

---

## 4. De dónde sale la NT (Nota de Transcripción) — conexión con la transcripción del alumno

```text
FLUJO:
1. El alumno sube su transcripción del día en su curso
   (es la EntregaResumen del documento de contexto; en el seminario se llama "transcripción").
2. El revisor (ADMIN / quien revise) abre la transcripción y le pone una NOTA: la NT, de 0 a 18.
3. Esa NT NO es visible para el alumno (campo interno). El alumno solo ve que entregó / que fue revisado.
4. La NT de cada día se trae AUTOMÁTICAMENTE a la columna NT de ese día en la grilla,
   y alimenta la fórmula de asistencia (asincrónico, mixto con día completo de F, y justificadas J).
```

Cambio de modelo (sobre EntregaResumen del documento de contexto):

```prisma
model EntregaResumen {
  // ...campos actuales (sesionId, estudianteId, urlR2, entregadoEn, fechaLimite, estado, requerido)...
  notaTranscripcion Float?   // NUEVO: NT 0-18 que pone el revisor. NUNCA se devuelve al rol ESTUDIANTE.
}
```

```text
Reglas:
- notaTranscripcion solo la edita ADMIN/revisor; el endpoint que sirve datos al ESTUDIANTE la omite.
- El día del registro semanal toma su NT del notaTranscripcion de la transcripción de ese día.
- NT válida: 0 a 18.
```

---

## 5. NOTA DE EXAMEN (se trae del módulo de exámenes, con respaldo manual)

```text
- notaExamenNorm  = nota del envío del examen NORMAL del curso (ExamenEnvio.puntajeTotal en escala 0-20).
- notaExamenRecup = nota del envío del examen SUSTITUTORIO (esSustitutorio = true), si existe.
- El envío real del módulo de exámenes SIEMPRE tiene prioridad ("AUTO"): si existe, es de solo lectura en
  la grilla y no se puede editar ni sobreescribir a mano ni por CSV.
- Si NO hay envío real, el campo queda editable ("MANUAL"): se puede escribir a mano en la grilla o traer
  por importación CSV (sección 9). Ese valor se guarda en RegistroSemanal.notaExamenNormManual /
  notaExamenRecupManual y se usa como nota de examen SOLO mientras no aparezca un envío real; si más
  adelante el alumno rinde el examen de verdad en el módulo, el dato automático pasa a mandar solo,
  sin que haga falta borrar el valor manual (queda guardado pero se ignora).
  Resolución (`resolveExamNotes` en `backend/src/services/grades-sheet.service.ts`):
  notaExamenNorm/Recup = AUTO ?? MANUAL ?? null.
- La grilla expone `examenNormAuto` / `examenRecupAuto` (booleanos) para que el frontend sepa si cada
  campo está bloqueado (AUTO) o editable (MANUAL).
- nota de examen usada = RECUP si existe; si no, NORM; si no hay ninguna, 0. (Confirmado con el cliente:
  NO es promedio de NORM y RECUP, aunque una hoja del cliente pueda sugerirlo — RECUP reemplaza a NORM.)
```

---

## 6. NOTA FINAL (siempre entera)

```text
notaExamen = notaExamenRecup si existe; si no, notaExamenNorm; si no hay ninguna, 0.
notaFinal  = Math.floor( (notaAsistencia + notaExamen) / 2 )   // SIEMPRE entera, truncada hacia abajo
aprobado   = notaFinal >= 11   (notaAprobatoria)

Verificado contra la hoja del cliente: los .5 caen hacia abajo (16.5 -> 16, 13.5 -> 13).
```

---

## 7. UI de la grilla semanal (estilo Excel)

```text
- Una grilla por curso, una fila por estudiante inscrito (igual que la hoja del cliente):
    Código | Apellidos y Nombres | Modo | Día1 (1h 2h 3h NT) | Día2(...) | Día3(...) | Nota Asist | Examen | Nota Final
- Celdas EDITABLES: solo las de cámara (1h/2h/3h) -> símbolos F/A/M/C/T (vacío = presente; sufijo J = justificada).
- Celdas NO editables (se traen solas): NT (de la transcripción), Examen (del módulo), Nota Asist y Nota Final (calculadas).
- Entrada rápida: Tab / Enter / flechas entre celdas, como hoja de cálculo.
- Selector de numDias (1, 2 o 3) por curso.
- Nota Asist y Nota Final se recalculan EN VIVO en el navegador con cada cambio de celda (cámara, modo o
  días de clase), usando una copia de la fórmula de la sección 3 en `frontend/src/lib/nota-asistencia.ts`.
  Es solo una VISTA PREVIA: la nota real la vuelve a calcular el backend con la misma fórmula
  (`backend/src/utils/nota-asistencia.ts`) al guardar — el backend sigue siendo la única autoridad de lo
  que queda persistido. Si se edita la fórmula, hay que actualizar ambos archivos.
- NO hay botón "Guardar" por fila. Los cambios de la grilla (celdas, modo, nota de Forum manual) viven
  en el estado del navegador y se persisten en Postgres con cualquiera de estos dos botones:
    - "Guardar notas": guarda TODAS las filas (una petición POST /grades-sheet por alumno, en paralelo)
      SIN publicar — el profesor/alumno todavía no ve el cambio. Sirve para no perder el trabajo si se
      va a seguir editando después.
    - "Mandar notas": hace el mismo guardado y además publica (POST /grades/publish), dejando la nota
      visible para el profesor/alumno.
  Implicancia: si se recarga o cierra la página sin haber tocado ninguno de los dos botones, recién ahí
  se pierden los cambios.
- La grilla vive dentro de un contenedor con alto máximo (`.notas-grid-scroll`, `max-height: 65vh`) y
  scroll propio en ambos ejes, para que la barra horizontal quede siempre a la vista sin tener que bajar
  hasta el final de la lista de alumnos. Encabezado (`thead`) y columnas Código/Apellidos y Nombres
  quedan fijos al hacer scroll, como en Excel (ver `frontend/src/app/globals.css`).
- Resaltado opcional: nota desaprobatoria en rojo.

OPCIONAL / EXPERIMENTAL — entrada por voz:
- Dictado de una FILA con la Web Speech API del navegador (mejor soporte en Chrome).
  Ej.: "falta, falta, apagada" -> rellena las celdas de cámara del día.
- Marcar como experimental; el teclado sigue siendo la vía principal.
```

---

## 8. Endpoints (backend = autoridad del cálculo)

```text
ESTUDIANTES (registro)
GET    /api/students                 lista + filtro por codigo/nombre (ADMIN)
POST   /api/students                 crear (ADMIN)
PATCH  /api/students/:id             editar (ADMIN)
POST   /api/students/import          importar CSV (ADMIN); valida duplicados por codigo, correo y DNI

TRANSCRIPCIÓN / NT
PATCH  /api/summaries/:id/review     ADMIN: marca revisado y fija notaTranscripcion (NT 0-18).
   -> la NT NUNCA se devuelve en respuestas dirigidas al rol ESTUDIANTE.

GRILLA SEMANAL / NOTAS
GET    /api/courses/:id/grades-sheet  filas con celdas de cámara editables + NT (de transcripción)
                                      + examen (del módulo) + notas calculadas.
POST   /api/courses/:id/grades-sheet  upsert de una fila { estudianteId, modo, numDias, celdasCamara,
                                      notaForumManual?, notaExamenNormManual?, notaExamenRecupManual? }
   -> el backend toma NT de las transcripciones del día, examen del módulo,
      recalcula notaAsistencia (sección 3) y notaFinal (sección 6), y guarda.
   -> el frontend ya no lo llama desde un botón "Guardar" por fila: lo llama una vez por alumno,
      en paralelo, tanto al hacer clic en "Guardar notas" como en "Mandar notas" (ver sección 7).
POST   /api/courses/:id/grades-sheet/import  importar CSV de la grilla (ADMIN), ver sección 9.
```

---

## 9. Importación CSV de la grilla de notas

```text
Botón "Importar CSV" en la grilla (vista ADMIN, `/cursos/[id]/notas`). Pensado para migrar hojas de
cálculo del cliente (formato RTS) sin tener que re-tipear celda por celda.

FORMATO ESPERADO DEL CSV (igual a la hoja del cliente):
  Código | Apellidos y Nombres | Modo de estudio | REGISTRO DE CÁMARA (Día1..Día3, cada uno 1h/2h/3h/NT)
  | NOTA DE ASIST. | NOTA EXAMEN o NOTA FORUM (NORM./RECUP.) | NOTA FINAL

Las columnas se ubican por PALABRA CLAVE en el encabezado (no por posición fija), igual que el import
de estudiantes (`matchHeader`, ver sección 1): busca "codigo", "apellidos", "modo", "camara", "asist",
"examen"/"forum". El ancho del bloque de cámara (columnas entre "camara" y "asist") determina numDias
(12 columnas = 3 días, 8 = 2, 4 = 1); ese numDias se aplica a TODAS las filas importadas y también
actualiza el selector "Días de clase" de la pantalla (si no se actualizara, un "Guardar notas" posterior
pisaría el numDias importado con el que tenía la pantalla antes).

QUÉ SE IMPORTA Y QUÉ NO:
- Se importa: símbolos de cámara (d1c1..d3c3, validados contra la lista de símbolos válidos F/A/M/C/T
  y sus variantes con J), modo de estudio, y examen/forum NORM./RECUP. como valor MANUAL (sección 5).
- NO se importa NUNCA: las celdas NT (siempre vienen de la transcripción revisada, sección 4) ni
  NOTA DE ASIST./NOTA FINAL (el backend las recalcula siempre con la fórmula oficial, nunca se confía
  en lo que traiga el CSV).
- Si hay envío real en el módulo de exámenes (AUTO), el valor manual del CSV se guarda pero se IGNORA
  para el cálculo (sección 5) — el automático manda siempre.

MATCHING DE ALUMNOS (`importGradesSheet` en `backend/src/services/grades-sheet.service.ts`):
- Solo aplica filas de alumnos YA INSCRITOS en el curso. Nunca crea ni matricula a nadie.
- Matchea primero por CÓDIGO (si el alumno inscrito tiene código y el CSV trae uno igual).
- Si no hay código (frecuente: hojas viejas donde muchos alumnos no tienen código asignado) o no matchea,
  cae a NOMBRE Y APELLIDO normalizado (`normalizarNombreKey`: sin tildes, mayúsculas, orden de palabras
  ignorado — compara el conjunto de palabras, no el string exacto).
- A propósito NO se usa matching difuso/por similitud (Levenshtein, substring, etc.): el riesgo de
  asignarle la nota a un alumno equivocado por nombres parecidos es peor que dejar la fila sin matchear.
  Si el nombre en el CSV difiere del registrado (apodo, nombre incompleto, typo, apellido distinto), la
  fila queda como "saltada" y hay que resolverlo a mano (corrigiendo el nombre en el registro o
  editando esa fila directo en la grilla) — no es un bug del importador.
- Lo que no matchea (por código o nombre) se cuenta como "saltado", con un aviso legible
  (`"Nombre" (código: X) no está inscrito en este curso`) para que el ADMIN pueda revisar caso por caso.
- El parseo del CSV (detección de columnas, símbolos, números) vive en `frontend/src/lib/grades-csv.ts`;
  reutiliza `readCsvFile`/`parseCsv`/`normalizeCsvHeader` de `frontend/src/lib/csv.ts` (mismo manejo de
  mojibake/encoding que el import de estudiantes).
```

---

## 10. Hecho cuando

```text
[ ] Registro de estudiantes con TODAS las columnas, edición tipo celda y filtro por código.
[x] Importación CSV funciona con el formato del cliente (sin duplicar por código/correo/DNI; DNI opcional).
[ ] La grilla semanal reproduce la hoja; solo las celdas de cámara son editables.
[ ] La NT se trae de la nota de transcripción puesta por el revisor y NO es visible para el alumno.
[ ] La nota de examen se trae del módulo (NORM normal, RECUP sustitutorio); examen vacío = 0.
[ ] La nota de asistencia coincide con la fórmula oficial (probar con filas reales de la hoja del cliente).
[ ] La nota final es ENTERA y truncada hacia abajo; coincide con la hoja.
[x] El backend es la autoridad de lo que se guarda; el frontend además muestra una vista previa en
    vivo recalculada con cada cambio de celda (misma fórmula duplicada en `frontend/src/lib/nota-asistencia.ts`).
[ ] backend y frontend: typecheck + build OK; pruebas de la fórmula con casos conocidos.
[x] Importación CSV de la grilla de notas (sección 9): matchea por código y, si falta, por nombre y
    apellido normalizado; nunca matricula a nadie nuevo; nunca pisa un examen con envío real en el módulo.
```
