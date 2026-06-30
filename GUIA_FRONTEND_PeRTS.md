# Guía de Implementación de Frontend — Intranet PeRTS
### Seminario Teológico de Remanentes · Sistema de diseño + rediseño pantalla por pantalla

> **Para Claude Code.** Este documento es la fuente de verdad de **diseño visual** del frontend.
> No cambia la lógica de negocio ni los endpoints (esos viven en la arquitectura del proyecto).
> Su trabajo es: aplicar el sistema de diseño, los componentes, las animaciones y el copy limpio
> a TODAS las pantallas listadas en `FRONTEND_PANTALLAS_COMPLETO.md`.
>
> Stack objetivo: **Next.js 16 (App Router) + React 18 + TypeScript + NextAuth**.
> Iconos: **lucide-react** (instalar). Fuentes: **next/font** con Google Fonts.

---

## 0. Las 3 reglas de oro (esto es lo que el cliente pidió explícitamente)

1. **CERO emojis en la interfaz.** Nada de 📚 📊 🎥 ✓ 🔄 ⚙️ 🎬 en botones, cards ni títulos.
   Todo emoji se reemplaza por un **icono SVG de lucide-react** (mapa en §6.2). Un emoji en un
   botón mata la sensación de producto serio; un icono de trazo fino la construye.

2. **CERO lenguaje técnico visible.** El usuario nunca debe leer "el backend valida", "endpoint",
   "POST /api/...", "token", "idempotencia", "schema", "proxy". Eso es vocabulario de
   desarrollador. La interfaz habla desde **lo que la persona hace**, no desde cómo está construido
   el sistema. Diccionario de reemplazo obligatorio en §5.

3. **Animaciones modernas, con criterio.** Movimiento que guía y da vida (entradas escalonadas,
   hover con elevación, transiciones de página, skeletons), nunca movimiento decorativo que
   distraiga. Catálogo cerrado de animaciones en §7. Siempre respetar `prefers-reduced-motion`.

Resultado esperado: que cualquier estudiante, profesor o administrador sienta que entra a una
**intranet académica seria, cálida y moderna** — no a un demo de programador.

---

## 1. Identidad de marca (de dónde sale cada decisión)

La marca ya existe en las imágenes entregadas. El diseño se **deriva de ellas**, no se inventa.

| Elemento de marca | Qué es | Dónde usarlo en la app |
|---|---|---|
| **Verde pino + franja diagonal con trama de puntos** | Cabecera del login, fondo institucional | Cabecera del login, sidebar, banners de cabecera de sección |
| **Bandera naranja con la figura "R"** (mascota) | Símbolo del seminario | Marca de agua sutil en login y vacíos; nunca como icono de botón |
| **Logo circular "PeRTS"** (cruz + libro, azul pizarra) | Logotipo formal | Login, sidebar (versión chica), favicon, correos |
| **Dorado de la "e" de PeRTS** | Acento refinado | Subrayados, focus de marca, detalles de chips destacados |
| **Lema "The Spiritual Emperor That Saved Emperors (Ge 41:38)"** | Frase de marca | Pie del login y página pública, en tamaño pequeño |

### Archivos de imagen (colócalos en `/public/brand/`)
```
/public/brand/logo-perts.svg          ← logo circular (preferir SVG; si no, PNG @2x)
/public/brand/flag-mascot.svg         ← figura R con bandera naranja
/public/brand/band-dots.svg           ← textura de puntos (o recrear en CSS, ver §7.6)
/public/brand/texture-paper.png       ← textura clara grunge (fondos opcionales, muy sutil)
```
> Si no hay SVG, exporta los PNG entregados a `@1x` y `@2x`. La textura de papel se usa a
> **opacidad ≤ 6%**, jamás a todo color (ensucia y resta profesionalismo).

---

## 2. Tokens de diseño (CSS variables) — fuente única

Crea `frontend/src/app/tokens.css` e impórtalo una sola vez en `globals.css`.
**Toda** la app consume estas variables. Nunca escribas un hex suelto en un componente.

```css
:root {
  /* — Verdes de marca (pino) — */
  --pine-900: #122E2A;   /* base sidebar / banda login */
  --pine-800: #173A35;
  --pine-700: #1E453F;   /* botón primario, títulos sobre claro */
  --pine-600: #2B5A52;
  --pine-500: #3C6E64;   /* hover de superficies verdes */
  --sage-200: #C6D3CF;   /* fin de degradado claro */
  --sage-100: #E7EDEA;

  /* — Acentos — */
  --flag:      #D9742F;  /* naranja bandera — CTA enérgico, uso escaso */
  --flag-600:  #C2641F;  /* hover del naranja */
  --gold:      #CBA85E;  /* dorado logo — detalles refinados */
  --gold-soft: #E3C988;
  --slate:     #8FA0B3;  /* azul pizarra del logo */

  /* — Neutros / superficie — */
  --paper:   #F5F4EF;    /* fondo de la app (off-white cálido) */
  --card:    #FFFFFF;
  --ink:     #14201E;    /* texto principal (negro con tinte verde) */
  --ink-soft:#4A5957;    /* texto secundario */
  --ink-mute:#8A938F;    /* texto terciario / placeholders */
  --line:    #E4E6E2;    /* hairlines y bordes */
  --line-2:  #EFF0EC;    /* bordes muy suaves / divisores internos */

  /* — Estados semánticos — */
  --ok:#2F7D54;     --ok-bg:#E6F2EB;     --ok-line:#BFE0CC;
  --warn:#B07A18;   --warn-bg:#FAF1DC;   --warn-line:#EAD6A2;
  --danger:#B23B36; --danger-bg:#FBEAE7; --danger-line:#F0C9C4;
  --info:#3C6E8F;   --info-bg:#E7F0F5;   --info-line:#C5DDE8;

  /* — Radios — */
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 22px;
  --r-pill: 999px;

  /* — Sombras (suaves, con tinte verde, nunca negro puro) — */
  --sh-1: 0 1px 2px rgba(18,46,42,.06), 0 1px 3px rgba(18,46,42,.05);
  --sh-2: 0 4px 12px rgba(18,46,42,.08), 0 2px 4px rgba(18,46,42,.05);
  --sh-3: 0 12px 32px rgba(18,46,42,.12), 0 4px 8px rgba(18,46,42,.06);
  --sh-focus: 0 0 0 3px rgba(203,168,94,.35);  /* halo dorado de foco */

  /* — Espaciado base (escala de 4) — */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px;
  --s-6:24px; --s-8:32px; --s-10:40px; --s-12:48px; --s-16:64px;

  /* — Tipografía (ver §3) — */
  --font-display: var(--font-fraunces), Georgia, serif;
  --font-body:    var(--font-hanken), system-ui, sans-serif;
  --font-mono:    var(--font-plexmono), ui-monospace, monospace;

  /* — Movimiento — */
  --ease: cubic-bezier(.22,.61,.36,1);      /* salida suave estándar */
  --ease-out: cubic-bezier(.16,1,.3,1);      /* entradas con carácter */
  --t-fast: 120ms;
  --t-base: 200ms;
  --t-slow: 360ms;

  /* — Anchos — */
  --sidebar-w: 264px;
  --content-max: 1180px;
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration:.001ms !important; animation-iteration-count:1 !important;
      transition-duration:.001ms !important; scroll-behavior:auto !important; }
}
```

---

## 3. Tipografía

Tres roles, tres familias. Cargar con `next/font/google` (sin parpadeo, sin pedir a Google en runtime).

| Rol | Familia | Uso |
|---|---|---|
| **Display** | **Fraunces** (serif con óptica) | Títulos grandes, "PeRTS" del login, números de portada. Con moderación. |
| **Cuerpo / UI** | **Hanken Grotesk** | Todo el texto de interfaz: labels, botones, párrafos, tablas. |
| **Datos / mono** | **IBM Plex Mono** | Códigos, DNI, notas numéricas, horas, "Tiempo restante". Da aire técnico-elegante a los números. |

```ts
// frontend/src/app/fonts.ts
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"], weight: ["400","500","600"], style:["normal","italic"],
  variable: "--font-fraunces", display: "swap",
});
export const hanken = Hanken_Grotesk({
  subsets: ["latin"], weight: ["400","500","600","700"],
  variable: "--font-hanken", display: "swap",
});
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400","500"],
  variable: "--font-plexmono", display: "swap",
});
```
En `layout.tsx` raíz:
```tsx
<html lang="es" className={`${fraunces.variable} ${hanken.variable} ${plexMono.variable}`}>
  <body>{children}</body>
</html>
```

### Escala tipográfica
```css
.display-xl { font:600 clamp(2.4rem,4vw,3.4rem)/1.05 var(--font-display); letter-spacing:-.02em; }
.display-l  { font:600 clamp(1.8rem,3vw,2.4rem)/1.1 var(--font-display); letter-spacing:-.015em; }
.h1 { font:600 1.6rem/1.2 var(--font-body); letter-spacing:-.01em; color:var(--ink); }
.h2 { font:600 1.25rem/1.25 var(--font-body); letter-spacing:-.005em; }
.h3 { font:600 1.05rem/1.3 var(--font-body); }
.body  { font:400 .975rem/1.55 var(--font-body); color:var(--ink); }
.small { font:400 .85rem/1.5 var(--font-body); color:var(--ink-soft); }
.eyebrow {
  font:600 .72rem/1 var(--font-body); letter-spacing:.14em; text-transform:uppercase;
  color:var(--pine-500);
}
.data { font:500 .9rem/1.2 var(--font-mono); font-variant-numeric:tabular-nums; }
```
> **Eyebrow**: la palabra pequeña en mayúsculas sobre cada título de sección ("Academia",
> "Administración", "Recursos"). Es parte de la identidad — úsala según la columna "Eyebrow"
> del inventario. Acento corto dorado debajo opcional (ver §6.5 *section header*).

---

## 4. Layout global

### 4.1 AppShell (todas las páginas `(app)/`)
```
┌──────────────┬─────────────────────────────────────────────┐
│   SIDEBAR    │  TOPBAR (sticky, fina)                       │
│  264px       ├─────────────────────────────────────────────┤
│  verde pino  │                                             │
│  logo arriba │   CONTENIDO (max 1180px, centrado)          │
│  nav         │   header de sección → contenido             │
│  ...         │                                             │
│  usuario +   │                                             │
│  cerrar ses. │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

- **Sidebar**: fondo `--pine-900`, ancho `--sidebar-w`. Logo circular PeRTS (chico) + "PeRTS"
  en Fraunces arriba. Ítems de nav según el rol (tabla del inventario). En `< 1024px` el sidebar
  se colapsa a un **drawer** que entra desde la izquierda (botón hamburguesa en la topbar).
- **Topbar**: blanca, `border-bottom: 1px solid var(--line)`, sticky. Izquierda: título de la
  página actual (o migas). Derecha: nombre del usuario + avatar con iniciales sobre círculo
  `--pine-700`. Sin emojis.
- **Contenido**: fondo `--paper`, padding `--s-8`, `max-width: var(--content-max)`.

#### Ítem de nav (sidebar)
```css
.nav-item {
  display:flex; align-items:center; gap:var(--s-3);
  padding:10px 14px; margin:2px 10px; border-radius:var(--r-md);
  color:#CFE0DB; font:500 .94rem/1 var(--font-body);
  transition:background var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}
.nav-item:hover { background:rgba(255,255,255,.06); color:#fff; }
.nav-item[aria-current="page"] {
  background:rgba(255,255,255,.10); color:#fff;
  box-shadow:inset 3px 0 0 var(--gold);   /* barra dorada de "activo" */
}
.nav-item svg { width:18px; height:18px; stroke-width:1.75; opacity:.9; }
```

### 4.2 AuthLayout (`/login`, `/forgot-password`, `/reset-password`, `/privacy`)
Pantalla completa, sin sidebar. Dos variantes:
- **Login**: banda diagonal de marca arriba (verde + trama de puntos) y la **card de acceso**
  centrada sobre fondo verde→claro. Reproduce la imagen 1, pero con los inputs reales (no
  rectángulos grises) y micro-animaciones. Ver §8.1.
- **Resto auth**: panel partido — izquierda verde con logo + mascota (imagen 2), derecha
  formulario sobre blanco.

---

## 5. Diccionario de copy — limpiar todo texto técnico

Regla: si una frase nombra **cómo** funciona el sistema, se reescribe en términos de **qué** logra
la persona. Estos reemplazos son obligatorios donde aparezcan en pantalla.

| No mostrar (técnico) | Mostrar (humano) |
|---|---|
| "El backend valida las notas" | *(no se muestra nada; es comportamiento interno)* |
| "Backend: GET /api/courses" | *(eliminar de la UI; es nota de documentación)* |
| "POST exitoso / 200 OK" | "Listo" / "Guardado" |
| "Error 400 / 401 / 500" | "No pudimos guardar. Revisa los datos e intenta de nuevo." |
| "Token inválido o expirado" | "Este enlace ya venció. Solicita uno nuevo." |
| "Idempotencia: envío ya registrado" | "Ya enviaste este examen." |
| "Procesando request…" | "Guardando…" / "Cargando…" |
| "Submit" | El verbo real: "Ingresar", "Crear curso", "Subir material", "Enviar examen" |
| "Sin data" / "null" | Vacío con dirección: "Aún no hay cursos. Crea el primero." |
| "Servicio: OK / DOWN" | "Operativo" / "Con problemas" |

### Microcopy de estados (usar tal cual)
- **Vacío genérico**: título corto + una acción. Ej. *"Aún no hay material en este curso."* +
  botón *"Subir material"*. Nunca dejar un vacío mudo.
- **Error de formulario** (bajo el campo): *"Ingresa un correo válido."* / *"La contraseña debe
  tener al menos 8 caracteres."* Sin signos de admiración, sin disculpas.
- **Éxito** (toast): verbo en pasado del botón. Botón "Publicar clase" → toast *"Clase publicada."*
- **Carga**: skeletons (no spinners a pantalla completa) + texto neutro *"Cargando…"* si hace falta.

> **Importante para Claude Code:** en `FRONTEND_PANTALLAS_COMPLETO.md` las líneas que empiezan con
> **"Backend:"** y las rutas `GET/POST/...` son **anotaciones de documentación**, NO texto de
> interfaz. No deben renderizarse en ninguna pantalla.

---

## 6. Componentes base

Todos con foco visible (`--sh-focus`), estados hover/active/disabled, y transiciones de §0.regla 3.

### 6.1 Botones
Cuatro variantes. **Sin emojis**; icono opcional de lucide a la izquierda (16–18px).

```css
.btn {
  --bg:var(--pine-700); --fg:#fff; --bd:transparent;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:11px 18px; border-radius:var(--r-md); border:1px solid var(--bd);
  background:var(--bg); color:var(--fg);
  font:600 .94rem/1 var(--font-body); letter-spacing:.01em;
  cursor:pointer; user-select:none;
  transition:transform var(--t-fast) var(--ease),
             box-shadow var(--t-base) var(--ease),
             background var(--t-base) var(--ease), filter var(--t-base) var(--ease);
  box-shadow:var(--sh-1);
}
.btn:hover    { transform:translateY(-1px); box-shadow:var(--sh-2); filter:brightness(1.04); }
.btn:active   { transform:translateY(0); box-shadow:var(--sh-1); filter:brightness(.97); }
.btn:focus-visible { outline:none; box-shadow:var(--sh-focus), var(--sh-1); }
.btn:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; filter:none; }
.btn svg { width:18px; height:18px; stroke-width:1.9; }

/* Variantes */
.btn--primary  { --bg:var(--pine-700); --fg:#fff; }
.btn--accent   { --bg:var(--flag); --fg:#fff; }            /* CTA enérgico, escaso */
.btn--accent:hover { background:var(--flag-600); }
.btn--secondary{ --bg:#fff; --fg:var(--pine-700); --bd:var(--line); box-shadow:none; }
.btn--secondary:hover { background:var(--sage-100); }
.btn--ghost    { --bg:transparent; --fg:var(--ink-soft); --bd:transparent; box-shadow:none; }
.btn--ghost:hover { background:var(--sage-100); color:var(--ink); }
.btn--danger   { --bg:var(--danger-bg); --fg:var(--danger); --bd:var(--danger-line); box-shadow:none; }
.btn--danger:hover { background:#F6DBD7; }

/* Tamaños */
.btn--sm { padding:8px 13px; font-size:.86rem; }
.btn--lg { padding:14px 22px; font-size:1rem; }
.btn--block { width:100%; }
```
**Cuándo usar cuál:**
- `primary` (verde): acción principal de cada pantalla (Ingresar, Crear curso, Guardar).
- `accent` (naranja): **una sola** llamada destacada por vista, alto impulso (ej. "Unirse a la
  clase ahora"). No abusar o pierde fuerza.
- `secondary`/`ghost`: acciones de soporte (Cancelar, Filtrar, Ver).
- `danger`: eliminar/desactivar. Siempre con confirmación (ver §6.7 diálogo).

### 6.2 Mapa emoji → icono lucide (reemplazo directo)
Quita el emoji, pon el icono. Importar de `lucide-react`.

| Emoji actual | Icono lucide | Contexto |
|---|---|---|
| 📚 Cursos | `BookOpen` | Card/nav cursos |
| 📊 Calificaciones / notas | `BarChart3` | Card/nav notas |
| 👥 Usuarios | `Users` | Card usuarios |
| 👨‍🏫 Profesores | `GraduationCap` | Card profesores |
| 🔄 Sustitutorios | `RefreshCw` | Card sustitutorios |
| ⚙️ Configuración | `Settings` | Card/nav config |
| 📝 Exámenes | `FileText` / `PenLine` | Card/nav exámenes |
| 🎥 / 🎬 Zoom / grabación | `Video` | Botón Zoom y grabación |
| 📅 Sesiones | `CalendarDays` | Card sesiones |
| 📁 Material | `FolderOpen` | Card material |
| ✓ Calificado / entregado | `CheckCircle2` (en chip, no en botón) | Badges de estado |
| 🏠 Inicio | `Home` | Nav inicio |

> Estilo de icono: trazo `1.75`, mismo color que el texto que acompaña, nunca relleno de color
> plano. En cards de acceso rápido, el icono va dentro de un **cuadro suave** (ver §6.5).

### 6.3 Inputs y formularios
```css
.field { display:flex; flex-direction:column; gap:6px; }
.label { font:600 .82rem/1 var(--font-body); color:var(--ink-soft); }
.input, .select, .textarea {
  width:100%; padding:11px 13px; border-radius:var(--r-md);
  border:1px solid var(--line); background:#fff; color:var(--ink);
  font:400 .95rem/1.4 var(--font-body);
  transition:border-color var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease);
}
.input::placeholder { color:var(--ink-mute); }
.input:hover { border-color:#D2D6D1; }
.input:focus { outline:none; border-color:var(--pine-500); box-shadow:var(--sh-focus); }
.input[aria-invalid="true"] { border-color:var(--danger); }
.field-error { font:400 .8rem/1.3 var(--font-body); color:var(--danger); }
.field-hint  { font:400 .8rem/1.3 var(--font-body); color:var(--ink-mute); }
```
- Inputs siempre con `<label>` real (accesibilidad). El placeholder no sustituye al label.
- Datos numéricos/código (DNI, notas) usan `class="data"` (mono tabular) en celdas y badges.

### 6.4 Card
```css
.card {
  background:var(--card); border:1px solid var(--line); border-radius:var(--r-lg);
  box-shadow:var(--sh-1); padding:var(--s-6);
  transition:transform var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease),
             border-color var(--t-base) var(--ease);
}
.card--link { cursor:pointer; }
.card--link:hover { transform:translateY(-3px); box-shadow:var(--sh-3); border-color:var(--sage-200); }
.card--link:active { transform:translateY(-1px); }
```

### 6.5 Encabezado de sección + card de acceso rápido
**Section header** (úsalo en cada pantalla con la columna Eyebrow/Título del inventario):
```html
<header class="section-head">
  <p class="eyebrow">Academia<span class="eyebrow-tick"></span></p>
  <h1 class="h1">Cursos</h1>
  <p class="small">Gestiona los cursos y sus sesiones del ciclo.</p>
</header>
```
```css
.section-head { margin-bottom:var(--s-8); }
.eyebrow { display:inline-flex; align-items:center; gap:10px; }
.eyebrow-tick { width:22px; height:2px; background:var(--gold); border-radius:2px; }
```

**Quick-access card** (reemplaza el grid de cards con emojis del dashboard):
```html
<a class="qa-card card card--link" href="/cursos">
  <span class="qa-icon"><!-- <BookOpen/> --></span>
  <span class="qa-body">
    <span class="qa-title">Cursos</span>
    <span class="qa-desc">Gestiona cursos y sesiones</span>
  </span>
  <span class="qa-arrow"><!-- <ArrowRight/> --></span>
</a>
```
```css
.qa-card { display:flex; align-items:center; gap:var(--s-4); padding:var(--s-5); }
.qa-icon {
  display:grid; place-items:center; width:46px; height:46px; flex:0 0 auto;
  border-radius:var(--r-md); background:var(--sage-100); color:var(--pine-700);
}
.qa-icon svg { width:22px; height:22px; stroke-width:1.75; }
.qa-title { display:block; font:600 1rem/1.2 var(--font-body); color:var(--ink); }
.qa-desc  { display:block; font:400 .85rem/1.3 var(--font-body); color:var(--ink-soft); }
.qa-arrow { margin-left:auto; color:var(--ink-mute);
  transition:transform var(--t-base) var(--ease), color var(--t-base) var(--ease); }
.qa-card:hover .qa-arrow { transform:translateX(4px); color:var(--pine-600); }
```

### 6.6 Badges / chips de estado
```css
.chip { display:inline-flex; align-items:center; gap:6px; padding:4px 10px;
  border-radius:var(--r-pill); font:600 .76rem/1 var(--font-body); border:1px solid transparent; }
.chip--ok     { background:var(--ok-bg); color:var(--ok); border-color:var(--ok-line); }
.chip--warn   { background:var(--warn-bg); color:var(--warn); border-color:var(--warn-line); }
.chip--danger { background:var(--danger-bg); color:var(--danger); border-color:var(--danger-line); }
.chip--neutral{ background:var(--sage-100); color:var(--ink-soft); border-color:var(--line); }
.chip svg { width:13px; height:13px; }
```
Uso: nota ≥11 → `chip--ok` ("Aprobado"); nota <11 → `chip--danger`; "Borrador" → `chip--warn`;
"Hoy" → `chip--neutral`; "Entregada" → `chip--ok` con `CheckCircle2` (icono, no emoji).

### 6.7 Tablas
```css
.table { width:100%; border-collapse:separate; border-spacing:0; }
.table th {
  text-align:left; font:600 .76rem/1 var(--font-body); letter-spacing:.06em;
  text-transform:uppercase; color:var(--ink-mute);
  padding:12px 14px; border-bottom:1px solid var(--line); background:var(--sage-100);
  position:sticky; top:0;
}
.table td { padding:13px 14px; border-bottom:1px solid var(--line-2); font-size:.92rem; }
.table tbody tr { transition:background var(--t-fast) var(--ease); }
.table tbody tr:hover { background:#FBFBF9; }
.table .num { font-family:var(--font-mono); font-variant-numeric:tabular-nums; }
```
Para la **grilla de notas** (Excel-like): celdas editables con `:focus` halo dorado; colores
de celda por valor (verde ≥11, rojo <11, gris sin nota) usando los tokens `--ok/--danger/--line`.
Sticky en primera columna (nombre) y cabecera. Nada de bordes negros gruesos.

### 6.8 Tabs
```css
.tabs { display:flex; gap:4px; border-bottom:1px solid var(--line); }
.tab {
  position:relative; padding:11px 16px; background:none; border:none; cursor:pointer;
  font:600 .9rem/1 var(--font-body); color:var(--ink-soft);
  transition:color var(--t-base) var(--ease);
}
.tab:hover { color:var(--ink); }
.tab[aria-selected="true"] { color:var(--pine-700); }
.tab[aria-selected="true"]::after {
  content:""; position:absolute; left:12px; right:12px; bottom:-1px; height:2px;
  background:var(--pine-700); border-radius:2px;
  animation:tab-in var(--t-base) var(--ease-out);
}
@keyframes tab-in { from{transform:scaleX(.4);opacity:0} to{transform:scaleX(1);opacity:1} }
```

### 6.9 Diálogo de confirmación (para eliminar/desactivar)
Modal centrado con overlay `rgba(18,46,42,.45)`, card blanca, título claro, botón `danger` +
`ghost`. Nunca borrar sin este paso. Texto: *"¿Eliminar este curso? Esta acción no se puede
deshacer."* Entrada con `pop-in` (§7).

### 6.10 Toast (notificaciones)
Esquina inferior derecha, apilados, auto-cierre 4s, entran con `slide-up`. Variantes ok/danger/
info con su color de borde izquierdo (3px). Texto = verbo en pasado del copy.

---

## 7. Catálogo de animaciones (cerrado — usar solo estas)

> Filosofía: **una entrada orquestada por pantalla** + micro-interacciones en hover/foco.
> Nada de elementos que rebotan sin parar ni parallax pesado. Todo cae bajo `prefers-reduced-motion`.

### 7.1 Entrada de página (stagger)
Al montar una vista, sus bloques principales aparecen con un leve fade + subida, escalonados.
```css
@keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
.stagger > * { opacity:0; animation:rise var(--t-slow) var(--ease-out) forwards; }
.stagger > *:nth-child(1){animation-delay:40ms}
.stagger > *:nth-child(2){animation-delay:90ms}
.stagger > *:nth-child(3){animation-delay:140ms}
.stagger > *:nth-child(4){animation-delay:190ms}
.stagger > *:nth-child(5){animation-delay:240ms}
.stagger > *:nth-child(n+6){animation-delay:280ms}
```
Aplica `.stagger` al contenedor de cards del dashboard, grids de cursos, listas.

### 7.2 Hover de card → `translateY(-3px)` + sombra (ya en §6.4). Flecha que avanza (§6.5).

### 7.3 Pop-in (modales, toasts, formularios que se expanden)
```css
@keyframes pop-in { from{opacity:0; transform:scale(.96) translateY(6px)} to{opacity:1; transform:none} }
.pop-in { animation:pop-in var(--t-base) var(--ease-out); }
```
Úsalo cuando ADMIN despliega el formulario "+ Nuevo curso/estudiante/profesor" (expandible).

### 7.4 Slide-up (toasts) / slide-in (drawer del sidebar móvil)
```css
@keyframes slide-up { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none} }
@keyframes slide-in { from{transform:translateX(-100%)} to{transform:none} }
```

### 7.5 Skeleton de carga (en vez de spinner)
```css
.skel { position:relative; overflow:hidden; background:var(--line-2); border-radius:var(--r-sm); }
.skel::after {
  content:""; position:absolute; inset:0; transform:translateX(-100%);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
  animation:shimmer 1.3s infinite;
}
@keyframes shimmer { to { transform:translateX(100%); } }
```
Muestra skeletons con la forma del contenido (cards, filas de tabla) mientras llegan los datos.

### 7.6 Banda de marca animada (signature, solo login/cabeceras)
La franja diagonal verde con trama de puntos es **el elemento firma**. La trama puede recrearse
en CSS (sin imagen) y desplazarse muy lento como atmósfera:
```css
.brand-band {
  background:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,.10) 1px, transparent 0) 0 0/18px 18px,
    linear-gradient(115deg, var(--pine-900), var(--pine-700));
  position:relative; overflow:hidden;
}
.brand-band::before { /* diagonales sutiles */
  content:""; position:absolute; inset:-40%;
  background:repeating-linear-gradient(115deg, transparent 0 60px, rgba(255,255,255,.02) 60px 62px);
  animation:drift 24s linear infinite;
}
@keyframes drift { to { transform:translateX(40px); } }
```
> Movimiento lentísimo (24s), apenas perceptible. Es atmósfera, no espectáculo.

### 7.7 Botón con "shine" al hover (solo `accent`, opcional y discreto)
Un reflejo diagonal cruza una vez al pasar el cursor. Si dudas, **omítelo**: la elevación basta.

### Reglas de oro de motion
- Duraciones: micro 120ms, base 200ms, entradas 360ms. Nunca > 500ms en UI.
- Easing de entrada = `--ease-out`; de salida/hover = `--ease`.
- Una sola animación de entrada por pantalla. No animar todo.
- `prefers-reduced-motion` desactiva todo (ya cubierto en tokens).

---

## 8. Rediseño pantalla por pantalla

> Para cada pantalla: se mantienen sus campos, acciones y endpoints del inventario.
> Aquí se define **cómo se ve y se siente** y qué textos cambian. Donde el inventario tenía
> emojis o frases técnicas, aplica §5 y §6.2.

### 8.1 Login `/login`  (referencia: imagen 1)
**Estructura:** banda de marca arriba (logo flag "R" + "Seminario Teológico de Remanentes" en
italic Fraunces). Debajo, sobre fondo verde→claro (imagen 7), la **card de acceso** centrada.

Dentro de la card:
- Marca: "PeRTS" en `display-l` (Fraunces) verde pino + logo circular debajo.
- Campos reales (no rectángulos grises): **Correo** y **Contraseña**, con label e icono lucide
  (`Mail`, `Lock`) dentro del input a la izquierda.
- Botón **primary block** "Ingresar" (verde). Al enviar: estado de carga en el propio botón
  (texto "Ingresando…" + spinner inline pequeño), no overlay.
- Links discretos: "Olvidé mi contraseña" y "Política de privacidad".
- Pie: lema *"The Spiritual Emperor That Saved Emperors (Ge 41:38)"* en `small`, color tenue.

**Animación:** la card entra con `pop-in`; los campos con `.stagger`. Banda con `drift` lento.
**Copy:** título "Intranet PeRTS" · subtítulo "Acceso para estudiantes, profesores y
administradores." · error de credenciales: *"Correo o contraseña incorrectos."* (sin "401").

```
┌───────────────────────────────────────────────┐
│ ◤ banda verde + puntos   R  Seminario…        │  ← brand-band
├───────────────────────────────────────────────┤
│                                               │
│            ╭───────────────────╮              │
│            │      PeRTS         │ display      │
│            │      (logo)        │              │
│            │  ✉ correo          │ input+icon   │
│            │  🔒 contraseña      │ input+icon   │
│            │  [   Ingresar    ] │ btn primary  │
│            │  olvidé · privacidad             │
│            ╰───────────────────╯              │
│        Ge 41:38 — lema en pequeño             │
└───────────────────────────────────────────────┘
```

### 8.2 Recuperar contraseña `/forgot-password` y 8.3 Nueva contraseña `/reset-password`
AuthLayout partido (izquierda verde con logo+mascota, derecha formulario). Un solo campo /
dos campos respectivamente, botón primary, link "Volver al inicio de sesión".
- `forgot`: tras enviar, mostrar estado de éxito en la misma card: *"Si el correo existe, te
  enviamos un enlace para crear una nueva contraseña."* (no confirmar si el correo existe).
- `reset` sin token: estado de error con dirección: *"Este enlace no es válido o ya venció."* +
  botón "Solicitar uno nuevo".

### 8.4 Política de privacidad `/privacy`
Documento legible: ancho de lectura ~680px, Fraunces para el H1, Hanken para el cuerpo,
secciones con `eyebrow`. Botón ghost "Volver al inicio de sesión" arriba. Fondo `--paper`.

### 8.5 Inicio / Dashboard `/inicio`
Saludo grande: *"Hola, {nombre}"* en `display-l`. Debajo, una línea de contexto por rol
(*"Esta es tu clase de la semana"* / *"Tu curso activo"* / panel admin).

**ADMIN** — fila de 3 *stat cards* (cursos activos / cursos totales / Zoom configurado) con número
en mono grande + label pequeño; luego **grid de accesos rápidos** usando `qa-card` (§6.5) con los
**iconos lucide** de §6.2 (no emojis). Contenedor con `.stagger`.

**PROFESOR / ESTUDIANTE** — card del curso activo (badge "Curso activo" con `chip--ok`), datos del
curso y profesor. Si hay Zoom: **botón `accent`** "Unirse a la clase ahora" con icono `Video`
(reemplaza "🎥 Unirse a Zoom"). Accesos rápidos como `qa-card`.

> Reemplazos de copy aquí: "🎥 Unirse a Zoom ahora" → "Unirse a la clase ahora" (+icono Video).
> "Ver todos mis cursos ({count}) →" → "Ver mis cursos ({count})" (+icono ArrowRight, sin "→").

### 8.6 Cursos — listado `/cursos`
`section-head` (eyebrow "Academia" / título "Cursos"). Si ADMIN: botón primary "Nuevo curso"
(icono `Plus`, sin "+") que despliega el formulario con `pop-in`. Grid de cards `card--link`
(hover elevación). Cada card: tipo · nombre (h3) · descripción · profesor · ciclo/año (chip
neutral) · "Inactivo" como `chip--warn` si aplica. Eliminar → botón `danger` + diálogo (§6.9).

### 8.7 Detalle de curso `/cursos/[id]` (workspace con tabs)
Top bar sticky con "← Cursos" (link ghost con icono `ChevronLeft`), tipo + nombre del curso.
Si hay Zoom: botón `accent` "Unirse a la clase" (icono Video). Tabs §6.8 según rol.
Cada tab (Sesiones, Material, Exámenes, Notas, Alumnos, Transcripción) con su contenido del
inventario, aplicando cards, tablas y chips de este sistema. "🎬 Grabación" → chip neutral con
icono `Video` + texto "Grabación". "Ver grabación" → botón secondary con icono `PlayCircle`.

### 8.8 Detalle de sesión `/cursos/[id]/sesiones/[sesionId]`
Header con fecha como `eyebrow` y título de sesión en h1. Tabs Grabación/Capturas/Asistencia/
Resúmenes. "🎬 Ver grabación en YouTube" → botón secondary "Ver grabación" (icono PlayCircle).
Asistencia: selects de estado por fila (Presente/Ausente/Tardanza) con chips de color; botón
primary "Guardar asistencia".

### 8.9 Grilla de notas `/cursos/[id]/notas`
Tabla Excel-like §6.7 con sticky de cabecera y primera columna, celdas editables con foco dorado,
color por valor. Controles: botones de día "1/2/3" como grupo segmentado; botón primary
"Publicar notas" (reemplaza "Mandar notas"); timestamp "Publicadas a las {hora}" en `small`.
Leyenda de descuentos (F/A/M/C-T/J) en una card aparte, legible, sin saturar.

### 8.10 Exámenes — listado `/exams`
`section-head` (eyebrow = rol). Botón primary "Nuevo examen" (icono Plus). Cards de examen con
chip de estado (Borrador=warn / Publicado=ok / Cerrado=neutral), metadatos en `small`, y botones
contextuales: "Dar examen" (primary), "Abrir" (secondary), "Resultados" (ghost), "Publicar"
(secondary). Sin emojis.

### 8.11 Crear examen `/exams/create`
Formulario por secciones con `section-head` interno: "Datos generales" y "Preguntas". Cada
pregunta es una card con `pop-in` al agregarse. Botones: "Agregar pregunta" (secondary, icono
Plus), "Quitar pregunta" (ghost danger, icono Trash2), "Agregar opción" (ghost). Submit primary
"Crear examen". El selector de tipo (Opción múltiple / V-F / Abierta) como segmented control.

### 8.12 Tomar / ver examen `/exams/[id]`
Para estudiante: badge superior "Tiempo restante MM:SS" en mono, con color que pasa a `warn` bajo
2 min y `danger` bajo 30s (sin parpadeo agresivo; transición de color suave). Preguntas como cards
apiladas con `.stagger`. Botón primary "Enviar examen" (disabled hasta responder todo o tiempo 0).
Estados ya-enviado: card centrada con icono `CheckCircle2`, mensaje del inventario (limpio).
Vista ADMIN/PROFESOR: solo lectura, opción correcta marcada con chip `ok` (icono Check), no con ✓.

### 8.13 Resultados `/exams/[id]/results`
Lista de alumnos (cards con nombre, email, fecha, chip de puntaje) → detalle por alumno
(answer-rows). Estados por respuesta con chips: Correcta=ok, Incorrecta=danger (muestra la
correcta), Pendiente=warn ("Pendiente de revisión"). Empty/cierre con copy del inventario limpio.

### 8.14 Material — biblioteca `/material`  y  8.15 Subir material `/material/subir`
Biblioteca: buscador (input + botón secondary "Filtrar", icono `Search`), grid de cards de archivo
con **badge de tipo** (chip neutral: PDF, MP4, DOCX…) e icono lucide por tipo (`FileText`,
`FileVideo`, `FileAudio`, `Image`, `FileSpreadsheet`). Botones "Descargar" (secondary, icono
`Download`) y "Eliminar" (danger). Subir: formulario claro con dropzone de archivos (estado hover/
drag con borde dorado punteado), botón primary "Subir material".

### 8.16 Calificaciones `/calificaciones`
Estudiante: tabla Curso · Nota final (chip ok/danger o "Aún no publicadas" neutral). ADMIN/PROF:
cronograma con columna por curso, chips, columna "Aprobados X/Y". Leyenda con chips. Encabezado
con eyebrow correspondiente.

### 8.17–8.19 Usuarios / Estudiantes / Profesores
Tablas §6.7 con filas editables inline (estado de edición con `pop-in`). Botones "Importar CSV"
(secondary, icono `Upload`), "Nuevo estudiante/profesor" (primary, icono Plus). Acciones por fila:
"Editar" (ghost, icono `Pencil`), "Guardar" (primary sm), "Cancelar" (ghost sm), "Eliminar"
(danger sm, icono Trash2) con diálogo. Nota de contraseña inicial en `field-hint`, no como alerta.

### 8.20 Sustitutorios `/sustitutorios`
Layout dos columnas: lista de exámenes (botones-lista con chip de estado) + panel de envíos por
alumno (cards con inputs de nota por respuesta). "✓ Todo calificado" → chip `ok` con icono Check.
Botones "Guardar calificación" (primary), "Marcar como revisado" (secondary, disabled hasta
completar). Feedback como toast, no texto rojo/verde suelto.

### 8.21 Configuración `/configuracion`
Card "Estado de servicios": pill global "Operativo/Con problemas" (chip) + lista servicio→estado.
**Traducir** "OK/DOWN/ready" a "Operativo/Con problemas". Card "Enlace Zoom del ciclo": input url,
botón primary "Guardar enlace", botón secondary "Probar enlace" (icono `ExternalLink`).

---

## 9. Accesibilidad y responsive (piso de calidad, no negociable)

- **Contraste** AA: texto principal sobre `--paper`/blanco cumple; verificar chips y texto
  secundario. Naranja `--flag` solo sobre blanco/verde, nunca texto naranja pequeño sobre claro.
- **Foco visible** en todo elemento interactivo (`--sh-focus`). No remover outline sin reemplazo.
- **Teclado**: tabs navegables con flechas; modales atrapan foco y cierran con Esc.
- **Labels reales** en todos los inputs; iconos decorativos con `aria-hidden`.
- **Responsive**: sidebar → drawer en `<1024px`; grids `repeat(auto-fill,minmax(260px,1fr))`;
  tablas anchas con scroll horizontal contenido (no romper layout); login y auth se apilan en móvil.
- **`prefers-reduced-motion`** ya desactiva animaciones (tokens §2).
- **Estados**: toda lista/tabla tiene loading (skeleton), vacío (con acción) y error (con guía).

---

## 10. Orden de implementación sugerido para Claude Code

1. Instalar `lucide-react`. Configurar fuentes (`fonts.ts`) en el layout raíz.
2. Crear `tokens.css` (§2) y `globals.css` (reset mínimo + import de tokens + clases de §3).
3. Construir **componentes base** en `src/components/ui/`: `Button`, `Input`, `Select`,
   `Textarea`, `Card`, `Chip`, `Table`, `Tabs`, `Modal`, `Toast`, `Skeleton`, `SectionHead`,
   `QuickAccessCard`, `EmptyState`. Cada uno consumiendo tokens y con sus estados.
4. Construir **layouts**: `AppShell` (sidebar+topbar) y `AuthLayout` (login + partido).
5. Rehacer pantallas en este orden: Login → Inicio → Cursos/Detalle → Exámenes → Material →
   Calificaciones → Admin (Usuarios/Estudiantes/Profesores/Sustitutorios/Configuración) → Auth
   secundarias → Privacidad.
6. Pasada de limpieza de copy (§5): buscar y eliminar todo texto técnico y todo emoji.
7. Pasada de animación (§7): aplicar `.stagger` en entradas, hover en cards, skeletons en cargas.
8. Pasada de accesibilidad/responsive (§9): foco, teclado, drawer móvil, estados vacíos.

### Checklist final (revisar antes de dar por hecho)
- [ ] No queda **ningún emoji** en la interfaz.
- [ ] No queda **ningún texto técnico** visible (backend, endpoints, códigos de error crudos).
- [ ] Todos los botones usan una de las 4 variantes y tienen hover/active/focus/disabled.
- [ ] Colores solo desde tokens; ningún hex suelto en componentes.
- [ ] Tipografía: Fraunces (display), Hanken (UI), Plex Mono (datos/números).
- [ ] Cada pantalla tiene `section-head` con eyebrow + título.
- [ ] Cada lista/tabla tiene loading, vacío y error con copy con dirección.
- [ ] Login reproduce la banda de marca + card, con `pop-in`/`stagger` y `drift` lento.
- [ ] Sidebar marca la página activa con barra dorada; colapsa a drawer en móvil.
- [ ] `prefers-reduced-motion` respetado; foco visible en todo.
- [ ] Marca: logo y mascota desde `/public/brand/`; textura a opacidad ≤6%.

---

*Fin de la guía. Mantiene intactos los endpoints y la lógica del proyecto; define únicamente la
capa visual, de interacción y de redacción de la intranet PeRTS.*
