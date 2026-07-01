# Plantilla de pantallas internas — Intranet PeRTS

> Para Claude Code. Define el **marco común de TODAS las pantallas internas** (después del login:
> inicio, cursos, exámenes, material, etc.). Corrige el error del degradado. No cambia lógica ni
> endpoints. Reemplaza/aclara la §4.1 de `GUIA_FRONTEND_PeRTS.md` (el sidebar ahora es degradado,
> no verde plano).

---

## Qué estaba mal

El degradado se aplicó al **fondo de toda la página**. Está mal. El degradado va **solo en la
franja/panel de la izquierda**. La estructura correcta es de **dos zonas**:

```
┌───────────────┬───────────────────────────────────────────────┐
│  PANEL IZQ.   │  CONTENIDO                                     │
│  (~290px)     │                                               │
│  degradado    │  fondo BLANCO con textura sutil (grietitas)   │
│  verde vert.  │                                               │
│               │  topbar fina + contenido de cada pantalla     │
│  logo arriba  │                                               │
│  navegación   │                                               │
│  ...          │                                               │
│  mascota "R"  │                                               │
│  abajo        │                                               │
└───────────────┴───────────────────────────────────────────────┘
```

- **Panel izquierdo:** degradado verde **vertical** (oscuro arriba → claro abajo). Logo PeRTS
  arriba, navegación en medio, mascota "R" pegada abajo. Ancho ~290px.
- **Contenido derecho:** fondo **blanco/hueso** con la **textura sutil** (las "grietitas") por
  encima a baja opacidad. Aquí va cada pantalla.

---

## Respuesta a tus dudas sobre las imágenes

| Elemento | ¿PNG o CSS? | Detalle |
|---|---|---|
| **Degradado verde** (panel izq.) | **CSS, no subas PNG** | Se clona con `linear-gradient`. Colores tomados de tu imagen. |
| **Textura blanca (grietitas)** | **PNG** | Usa `public/brand/texture-paper.png` (ya generada, repetible). Puedes reemplazarla por la tuya si quieres. |
| **Logo PeRTS** | PNG transparente | `public/brand/logo-perts.png` (ya lo tienes). |
| **Mascota "R"** | PNG transparente | `public/brand/flag-mascot.png` (ya lo tienes). Va blanca sobre el verde del panel. |

> El degradado en imagen pesa y se pixela al escalar; en CSS es nítido y liviano. La textura sí
> conviene como PNG porque el grunge no se logra bien con CSS.

---

## CSS del marco (AppShell)

```css
/* ===== Estructura de dos zonas ===== */
.shell{ display:flex; min-height:100dvh; }

/* ===== Panel izquierdo: degradado verde vertical ===== */
.shell__rail{
  width:290px; flex:0 0 290px;
  display:flex; flex-direction:column;
  /* degradado clonado de la imagen: oscuro arriba -> sage abajo */
  background:linear-gradient(180deg,#173A35 0%, #2B5A52 38%, #3C6E64 60%, #C6D3CF 100%);
  position:relative; overflow:hidden;
}
.rail__logo{ padding:26px 22px 8px; display:flex; justify-content:center; }
.rail__logo img{ width:96px; height:96px; }
.rail__nav{ display:flex; flex-direction:column; gap:2px; padding:14px 12px; margin-top:6px; }
.rail__spacer{ flex:1; }
.rail__mascot{ padding:0 18px 16px; display:flex; justify-content:flex-start; }
.rail__mascot img{ width:120px; height:auto; }   /* la "R" blanca, abajo a la izquierda */

/* ===== Contenido derecho: blanco + textura ===== */
.shell__main{ flex:1; min-width:0; display:flex; flex-direction:column;
  background:#FBFBF9; position:relative; }
.shell__main::before{   /* textura "grietitas" por encima, MUY sutil */
  content:""; position:absolute; inset:0; pointer-events:none;
  background:url('/brand/texture-paper.png'); background-size:640px 640px;
  opacity:.45; mix-blend-mode:multiply;
}
.shell__content{ position:relative; z-index:1;
  max-width:var(--content-max); width:100%; margin:0 auto; padding:32px 36px; }

/* ===== Topbar fina dentro del contenido ===== */
.topbar{ position:sticky; top:0; z-index:5;
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 36px; background:rgba(251,251,249,.85); backdrop-filter:blur(6px);
  border-bottom:1px solid var(--line); }
```

> **Opacidad de la textura:** `.45` es un buen punto. Si se ve muy marcada, baja a `.25`; si no se
> nota, sube a `.6`. La idea es que apenas se intuya, nunca que ensucie el texto.

### Navegación legible sobre el degradado
El degradado se aclara abajo, así que los ítems de nav viven en la **zona superior (oscura)** y el
ítem activo lleva una pastilla translúcida + barra dorada (se lee sobre cualquier tono):
```css
.nav-item{ display:flex; align-items:center; gap:12px; padding:10px 14px; margin:2px 4px;
  border-radius:var(--r-md); color:#EAF1EE; font:500 .94rem/1 var(--font-body);
  text-shadow:0 1px 2px rgba(18,46,42,.25);   /* legibilidad sobre tonos medios */
  transition:background var(--t-fast) var(--ease), color var(--t-fast) var(--ease); }
.nav-item:hover{ background:rgba(255,255,255,.12); color:#fff; }
.nav-item[aria-current="page"]{ background:rgba(255,255,255,.18); color:#fff;
  box-shadow:inset 3px 0 0 var(--gold); }
.nav-item svg{ width:18px; height:18px; stroke-width:1.75; }
```
> Si tienes muchos ítems de menú y llegan a la zona clara del degradado, ajusta el degradado para
> que el tramo de navegación se mantenga oscuro: mueve la parada clara más abajo, ej.
> `... #3C6E64 75%, #C6D3CF 100%)`.

---

## Estructura JSX del marco

```tsx
import Image from "next/image";
import { Home, BookOpen, FileText, FolderOpen, BarChart3 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="shell__rail">
        <div className="rail__logo">
          <Image src="/brand/logo-perts.png" alt="PeRTS" width={96} height={96} />
        </div>

        <nav className="rail__nav">
          <a className="nav-item" href="/inicio" aria-current="page"><Home/> Inicio</a>
          <a className="nav-item" href="/cursos"><BookOpen/> Cursos</a>
          <a className="nav-item" href="/exams"><FileText/> Exámenes</a>
          <a className="nav-item" href="/material"><FolderOpen/> Material</a>
          <a className="nav-item" href="/calificaciones"><BarChart3/> Calificaciones</a>
          {/* (los ítems se muestran según el rol; ver guía principal) */}
        </nav>

        <div className="rail__spacer" />
        <div className="rail__mascot">
          <Image src="/brand/flag-mascot.png" alt="" width={120} height={186} aria-hidden />
        </div>
      </aside>

      <main className="shell__main">
        <header className="topbar">
          {/* izquierda: título de la página actual · derecha: usuario + avatar (sin emojis) */}
        </header>
        <div className="shell__content">
          {children}
        </div>
      </main>
    </div>
  );
}
```

---

## Responsive (móvil / pantallas chicas)

En `< 1024px` el panel izquierdo se oculta y se vuelve un **drawer** que entra desde la izquierda
con un botón en la topbar (icono `Menu` de lucide). El degradado y el contenido con textura se
mantienen igual; solo cambia que el panel deja de ser fijo.

```css
@media (max-width:1024px){
  .shell__rail{ position:fixed; left:0; top:0; bottom:0; z-index:40;
    transform:translateX(-100%); transition:transform var(--t-base) var(--ease); }
  .shell__rail.is-open{ transform:none; box-shadow:var(--sh-3); }
  .shell__content{ padding:20px; }
}
```

---

## Verificación

- [ ] El degradado verde está **solo en el panel izquierdo**, no en toda la página.
- [ ] El degradado es **vertical**: verde oscuro arriba → sage claro abajo (como la imagen).
- [ ] El logo PeRTS está arriba del panel; la mascota "R" abajo a la izquierda.
- [ ] El área de contenido es **blanca/hueso** con la **textura sutil** (`texture-paper.png`)
      por encima, sin que estorbe la lectura.
- [ ] La navegación se lee bien sobre el degradado (zona superior oscura + ítem activo con
      pastilla translúcida y barra dorada).
- [ ] En móvil, el panel se vuelve drawer con botón de menú.
- [ ] Todas las pantallas internas usan este mismo marco (`AppShell`).
```
