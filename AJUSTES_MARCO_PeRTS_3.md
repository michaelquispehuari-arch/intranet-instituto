# Ajustes del marco interno (parte 3) — Intranet PeRTS

> Para Claude Code. Tres correcciones sobre el marco de las pantallas internas. Referencia visual:
> `_preview_panel.png`. No cambia lógica ni endpoints. **Reemplaza** la `.topbar` definida en
> `PLANTILLA_PANTALLAS_INTERNAS_PeRTS.md` y el bloque inferior de `CORRECCION_PANEL_LATERAL_PeRTS.md`.

---

## 1. Quitar el encabezado blanco superior (topbar)

En cada pantalla aparece una **barra blanca arriba** que repite el título ("Cursos", "Exámenes",
"Calificaciones"…) y a la **derecha** muestra el usuario/avatar. **Quitar esa barra.**

Motivo: es redundante. El título de cada pantalla ya se muestra dentro del contenido (el
encabezado de sección: "ADMINISTRACIÓN — Hola, Admin" / "Cursos", etc.), y el usuario ya vive en
el panel izquierdo abajo. No hace falta repetirlo arriba.

```css
/* ELIMINAR el bloque .topbar del contenido. El contenido empieza directo con su encabezado. */
.shell__main{ flex:1; min-width:0; display:flex; flex-direction:column;
  background:#FBFBF9; position:relative; }
.shell__content{ position:relative; z-index:1;
  max-width:var(--content-max); width:100%; margin:0 auto; padding:36px 40px; }
```
```tsx
<main className="shell__main">
  {/* SIN topbar: el contenido arranca con el encabezado de sección de cada página */}
  <div className="shell__content">
    {children}
  </div>
</main>
```

**Solo en móvil** se conserva una barra mínima con el botón de menú (para abrir el panel), sin
título ni usuario:
```css
.mobile-bar{ display:none; }
@media (max-width:1024px){
  .mobile-bar{ display:flex; align-items:center; gap:10px;
    padding:10px 14px; background:#FBFBF9; border-bottom:1px solid var(--line);
    position:sticky; top:0; z-index:10; }
}
```
```tsx
<div className="mobile-bar">
  <button className="btn btn--ghost btn--sm" onClick={openDrawer} aria-label="Abrir menú">
    <Menu />   {/* lucide-react */}
  </button>
</div>
```

---

## 2. Quitar la línea divisoria del panel (la que pasa detrás de la R)

En el panel izquierdo había una línea horizontal arriba del bloque de usuario que cruzaba por
**detrás de la mascota "R"**. **Eliminarla.** El bloque de usuario no lleva `border-top`.

```css
.rail__user{
  position:absolute; left:0; bottom:0; z-index:3;
  padding:16px 18px;
  max-width:158px;          /* limita el ancho: el texto no llega hasta la R */
  /* sin border-top, sin línea divisoria */
}
```

---

## 3. La R no debe tapar a "Admin General"

El usuario va **abajo a la izquierda** y la mascota **abajo a la derecha**, **sin solaparse**.
La "R" se ancla a la derecha con un leve **sangrado** (parte fuera del borde) para alejar su asta
del texto.

```css
.rail__mascot{
  position:absolute; bottom:0; right:-12px;   /* sangra ~12px a la derecha */
  z-index:1; pointer-events:none;
  width:138px; height:auto;                   /* grande pero sin invadir el texto */
}
```
```tsx
{/* mascota: va ANTES del bloque de usuario en el DOM para quedar por debajo en capas */}
<img className="rail__mascot" src="/brand/flag-mascot.png" alt="" aria-hidden />

<div className="rail__user">
  <div className="rail__user-row">
    <span className="rail__avatar">AG</span>
    <span className="rail__name">Admin General</span>
  </div>
  <button className="rail__logout"><LogOut/> Cerrar sesión</button>
</div>
```

> Ajuste fino: si todavía se rozan, sube el sangrado a `right:-18px` o baja la "R" a `width:128px`.
> Si la quieres más grande sin chocar, mantén `max-width:158px` en `.rail__user` y aleja más la R
> con `right:-22px`.

---

## Resultado (parte inferior del panel)

```
│  ▭ Configuración            │
│                             │
│        (degradado claro)    │
│                         ╱▔╲ │
│                        │ R │ │  ← R abajo-derecha (sangrada), SIN línea detrás
│ (AG) Admin General     │ R │ │  ← usuario abajo-izquierda, NO se tapa con la R
│      Cerrar sesión      ╲_╱  │
└─────────────────────────────┘
```

---

## Verificación

- [ ] **No** hay barra blanca superior repitiendo el título ni el usuario a la derecha.
- [ ] El título de cada pantalla se ve **dentro del contenido** (encabezado de sección).
- [ ] En móvil hay una barra mínima solo con el botón de menú.
- [ ] **No** hay línea divisoria cruzando detrás de la "R".
- [ ] "Admin General" + "Cerrar sesión" están **abajo a la izquierda** y **no** los tapa la "R".
- [ ] La "R" está **abajo a la derecha**, grande y sin invadir el texto del usuario.
- [ ] Se mantiene todo lo anterior: logo de fondo centrado, iconos del menú, ítem activo con barra
      dorada. Debe verse como `_preview_panel.png`.
