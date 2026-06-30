# Correcciones de Login — Intranet PeRTS

> Para Claude Code. Dos arreglos en la pantalla de login (`/login`). No cambia lógica ni endpoints,
> solo el diseño y el comportamiento de los campos. Referencia de estilo: `starter/login-page.tsx`
> y `starter/base.css`. Asset nuevo: `public/brand/login-bg.svg`.

---

## Corrección 1 — Fondo del login (no debe verse difuminado)

**Problema:** el fondo quedó como un degradado que se aclara hacia abajo (verde → claro/sage),
y se ve "difuminado". No corresponde.

**Correcto:** la tarjeta blanca flota sobre un **campo verde OSCURO casi parejo** (entre
`#11231F` y `#172B29`), con **franjas diagonales sutiles a ~115°** y **grupos de puntos** en las
esquinas (arriba-derecha, medio-derecha, abajo-izquierda). Sin degradado a verde claro.

**Qué hacer:**
1. Copia el asset `public/brand/login-bg.svg` al proyecto (ya generado).
2. En el área donde va la tarjeta (el "stage" del login), aplica este fondo y **elimina cualquier
   `linear-gradient` que termine en verde claro/sage**:

```css
.login__stage{
  flex:1;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:18px; padding:48px 20px;
  background:#142625 url('/brand/login-bg.svg') center / cover no-repeat;  /* ← fondo correcto */
}
```

> Alternativa solo-CSS (si no quieres usar la imagen). Los puntos saldrán en todo el campo, no
> agrupados en esquinas, pero el tono oscuro y las franjas quedan bien:
> ```css
> .login__stage{
>   background-color:#142625;
>   background-image:
>     radial-gradient(circle at 1px 1px, rgba(223,234,230,.045) 1.4px, transparent 0),
>     repeating-linear-gradient(115deg,#11231F 0 110px,#172B29 110px 230px,#0F2120 230px 360px);
>   background-size:22px 22px, auto;
> }
> ```

La banda superior (logo de la bandera "R" + "Seminario Teológico de Remanentes" en italic +
línea blanca fina) se mantiene como está.

---

## Corrección 2 — Campos de correo y contraseña (placeholder e icono)

**Problema:** el texto gris ("nombre@seminario.edu", "contraseña") **no es un placeholder real**;
quedó como un texto/elemento puesto detrás del input, por eso **no desaparece al escribir** y el
texto escrito queda **encima**. Además el icono (sobre/candado) está **mal cuadrado** y se solapa
con el texto.

**Causa:** se simuló el placeholder con un `<span>`/`<label>`/pseudo-elemento por detrás, y el
input no reserva espacio a la izquierda para el icono.

**Qué hacer:**

1. **Usa el atributo `placeholder` nativo del `<input>`** para el texto gris. Ese sí desaparece
   solo al escribir. **Elimina** cualquier `<span>`, `<label>` flotante o `::before/::after` que
   esté simulando el placeholder por detrás del campo.
2. El icono va dentro de un contenedor `.input-wrap` con `position:relative`. El icono se posiciona
   absoluto y con `pointer-events:none` para que **no tape el texto ni el clic**. El input lleva
   `padding-left` para dejarle sitio.

**Markup correcto (aplícalo a correo y contraseña, y a todos los inputs con icono):**
```tsx
import { Mail, Lock } from "lucide-react";

{/* Correo */}
<div className="field">
  <label className="label" htmlFor="email">Correo</label>
  <div className="input-wrap">
    <Mail className="lead-icon" aria-hidden />
    <input
      id="email"
      type="email"
      className="input"
      placeholder="nombre@seminario.edu"   /* placeholder REAL */
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      autoComplete="email"
      required
    />
  </div>
</div>

{/* Contraseña */}
<div className="field">
  <label className="label" htmlFor="password">Contraseña</label>
  <div className="input-wrap">
    <Lock className="lead-icon" aria-hidden />
    <input
      id="password"
      type="password"
      className="input"
      placeholder="Tu contraseña"          /* placeholder REAL */
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      autoComplete="current-password"
      required
    />
  </div>
</div>
```

**CSS correcto:**
```css
.field{ display:flex; flex-direction:column; gap:6px; }
.label{ font:600 .82rem/1 var(--font-body); color:var(--ink-soft); }

.input{
  width:100%;
  padding:11px 13px;
  border-radius:var(--r-md);
  border:1px solid var(--line);
  background:#fff;
  color:var(--ink);
  font:400 .95rem/1.4 var(--font-body);
  transition:border-color var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease);
}
.input::placeholder{ color:var(--ink-mute); }     /* color del texto gris de ayuda */
.input:hover{ border-color:#D2D6D1; }
.input:focus{ outline:none; border-color:var(--pine-500); box-shadow:var(--sh-focus); }

/* Campo con icono a la izquierda */
.input-wrap{ position:relative; }
.input-wrap .input{ padding-left:40px; }          /* espacio para el icono */
.input-wrap .lead-icon{
  position:absolute;
  left:12px; top:50%;
  transform:translateY(-50%);
  width:18px; height:18px;
  color:var(--ink-mute);
  pointer-events:none;                            /* el icono no captura clics ni tapa el texto */
}
```

---

## Verificación (debe cumplirse al terminar)

- [ ] El fondo del login es verde **oscuro** con franjas diagonales y puntos en esquinas; **no** se
      aclara hacia abajo ni se ve difuminado.
- [ ] La tarjeta blanca queda nítida y centrada sobre ese fondo oscuro.
- [ ] Al escribir en Correo o Contraseña, el texto gris (placeholder) **desaparece solo**.
- [ ] El texto que escribo **no se monta** sobre otro texto ni sobre el icono.
- [ ] El icono (sobre/candado) está **alineado verticalmente** al centro y separado del texto.
- [ ] Hacer clic en cualquier parte del campo enfoca el input (el icono no bloquea el clic).
- [ ] No quedó ningún `<span>`/`<label>` flotante simulando placeholder por detrás del input.

> Aplica el mismo patrón de input (placeholder nativo + `.input-wrap` con icono absoluto y
> `pointer-events:none`) a **todos** los formularios del sistema, no solo al login.
