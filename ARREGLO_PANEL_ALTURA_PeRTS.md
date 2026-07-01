# Arreglo del panel: altura fija + logo de fondo centrado — Intranet PeRTS

> Para Claude Code. El panel izquierdo debe ocupar **todo el alto de la pantalla** (no crecer con
> el contenido) para que el logo de fondo quede **centrado a la vista** y la mascota "R" quede
> **abajo, visible sin hacer scroll**. Además hay que usar el logo **grande de fondo** (watermark),
> no el logo chico de arriba. Referencia: `_preview_panel.png`.

---

## Diagnóstico (por qué se ve mal ahora)

- El panel está creciendo con el **alto del contenido** (que hace scroll y es muy largo). Por eso
  el logo "centrado" cae muy abajo y la "R" queda al final → hay que hacer scroll para verla.
- Quedó visible el **logo chico de arriba**; el **logo grande de fondo** (watermark) no se aplicó.

**Solución:** fijar el panel a la altura de la ventana (`100vh`) y pegarlo con `sticky`, quitar el
logo chico de arriba, y poner el logo grande centrado **por detrás** del menú.

---

## CSS (reemplazar el del panel)

```css
/* El contenedor general permite que el panel se quede fijo mientras el contenido hace scroll */
.shell{ display:flex; align-items:flex-start; min-height:100dvh; }

/* PANEL: alto de la PANTALLA, no del contenido. Pegado arriba. */
.shell__rail{
  width:290px; flex:0 0 290px;
  height:100vh;                 /* ← clave: alto de la ventana, no del contenido */
  position:sticky; top:0;       /* ← se queda fijo aunque el contenido baje */
  align-self:flex-start;
  display:flex; flex-direction:column;
  background:linear-gradient(180deg,#173A35 0%, #2B5A52 40%, #3C6E64 62%, #C6D3CF 100%);
  overflow:hidden;
}

/* 1) QUITAR el logo chico de arriba. NO debe haber un <img> pequeño en la cabecera del panel. */

/* 2) LOGO GRANDE de fondo (watermark), centrado en el panel, DETRÁS del menú */
.rail__watermark{
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:236px; height:auto;     /* grande */
  opacity:.30; z-index:0; pointer-events:none;
}

/* 3) Navegación por encima del watermark */
.rail__nav{ position:relative; z-index:2;
  display:flex; flex-direction:column; gap:2px; padding:24px 12px 12px; }

/* 4) Mascota "R" grande, abajo-derecha, SIN línea, sin tapar al usuario */
.rail__mascot{ position:absolute; right:-12px; bottom:0; z-index:1; pointer-events:none;
  width:138px; height:auto; }

/* 5) Usuario abajo-izquierda, encima de todo, sin línea divisoria */
.rail__user{ position:absolute; left:0; bottom:0; z-index:3;
  padding:16px 18px; max-width:158px; }
```

---

## JSX (estructura correcta del panel)

```tsx
<aside className="shell__rail">
  {/* NO poner logo chico arriba. Solo el watermark grande de fondo: */}
  <img className="rail__watermark" src="/brand/logo-perts.png" alt="" aria-hidden />

  <nav className="rail__nav">
    {/* ítems con sus iconos lucide (Inicio activo, etc.) */}
  </nav>

  {/* mascota antes del usuario en el DOM => queda por debajo en capas */}
  <img className="rail__mascot" src="/brand/flag-mascot.png" alt="" aria-hidden />

  <div className="rail__user">
    <div className="rail__user-row">
      <span className="rail__avatar">AG</span>
      <span className="rail__name">Admin General</span>
    </div>
    <button className="rail__logout"><LogOut/> Cerrar sesión</button>
  </div>
</aside>
```

> Importante: el panel tiene **una sola** imagen de logo (el watermark grande de fondo).
> Si existe un `<img>` de logo chico en la parte superior del panel, **bórralo**.

---

## Si el panel debe navegar mucho (muchos ítems)

Con `height:100vh` los 8 ítems entran de sobra. Si en el futuro hay más ítems de los que caben,
haz que **solo el nav** tenga scroll interno, sin que crezca el panel:
```css
.rail__nav{ overflow-y:auto; }
```

---

## Verificación

- [ ] El panel ocupa **todo el alto de la pantalla** y se queda fijo al hacer scroll del contenido.
- [ ] El logo PeRTS se ve **grande y centrado** en el panel, detrás del menú.
- [ ] **No** hay un logo chico arriba (solo el watermark grande).
- [ ] La mascota "R" se ve **abajo**, sin necesidad de hacer scroll.
- [ ] "Admin General" + "Cerrar sesión" abajo-izquierda; la "R" abajo-derecha; **no** se tapan.
- [ ] Debe verse como `_preview_panel.png`.
