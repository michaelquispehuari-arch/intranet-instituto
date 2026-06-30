# Ajustes de Login (parte 2) — Intranet PeRTS

> Para Claude Code. Cambios en `/login`. No toca lógica ni endpoints. Referencia de estilo:
> `starter/login-page.tsx` y `starter/base.css`.

---

## Resumen de cambios

1. **Agregar** una franja/línea **blanca** justo debajo de la cabecera (donde está la "R").
2. **Quitar** el subtítulo "Acceso para estudiantes, profesores y administradores."
3. **Quitar** el lema del pie "The Spiritual Emperor That Saved Emperors · Ge 41:38".
4. **Quitar** el enlace "Olvidé mi contraseña".
5. **Correo electrónico:** el placeholder usa dominio **gmail.com** (es el correo personal de
   cada usuario). Ej: `nombre@gmail.com`.
6. **Política de privacidad:** no va como página/enlace suelto. Va como **ventana flotante (modal)
   con letra pequeña**, presentación estándar y conforme a la ley (Perú, Ley N° 29733).

---

## 1. Franja blanca bajo la cabecera

La cabecera (banda verde con la mascota "R" + "Seminario Teológico de Remanentes") lleva debajo
una **línea blanca nítida de ancho completo**. No usar un borde semitransparente tenue.

```css
.login__band{
  display:flex; align-items:center; gap:14px;
  padding:18px 28px;
  border-bottom:2px solid #ffffff;     /* ← franja blanca nítida, ancho completo */
}
```
> Si la quieres más marcada como "barra" y no como línea, usa en su lugar un elemento separado:
> ```html
> <div class="login__rule" aria-hidden></div>
> ```
> ```css
> .login__rule{ height:3px; background:#fff; width:100%; }
> ```

---

## 2 y 3. Quitar subtítulo y lema

- Eliminar el párrafo del subtítulo bajo el título "Intranet PeRTS"
  ("Acceso para estudiantes, profesores y administradores.").
- Eliminar el párrafo del pie con el lema ("The Spiritual Emperor That Saved Emperors · Ge 41:38").

Quedan eliminados estos nodos (y su CSS asociado `.login__sub` y `.login__lemma` si ya no se usan).

---

## 4 y 5. Enlace y correo

- Quitar el `<Link href="/forgot-password">Olvidé mi contraseña</Link>` y el separador `·`.
- En el input de correo, el `placeholder` cambia a **`nombre@gmail.com`**.

---

## 6. Política de privacidad como ventana flotante (modal)

En el pie del formulario queda **un solo enlace pequeño**: "Política de privacidad". Al hacer clic,
abre un **modal flotante** con el texto legal en **letra pequeña**, scrollable, con botón de cerrar.
Es la forma estándar de presentarla.

### Componente `PrivacyModal.tsx`
```tsx
"use client";
import { X } from "lucide-react";

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Política de privacidad"
         onClick={onClose}>
      <div className="modal pop-in privacy" onClick={(e) => e.stopPropagation()}>
        <header className="privacy__head">
          <h2 className="h3">Política de Privacidad</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </header>

        <div className="privacy__body">
          <p><strong>Responsable del tratamiento:</strong> Seminario Teológico PeRTS.</p>

          <p><strong>1. Datos que tratamos.</strong> Recopilamos los datos necesarios para la
          gestión académica: nombre y apellidos, correo electrónico, rol (estudiante, profesor o
          administrador), cursos en los que participa, calificaciones, asistencia y materiales.</p>

          <p><strong>2. Finalidad.</strong> Los datos se usan únicamente para administrar el acceso
          a la intranet, gestionar cursos, exámenes, materiales y calificaciones, y comunicar
          información académica.</p>

          <p><strong>3. Base legal y consentimiento.</strong> El tratamiento se realiza conforme a
          la Ley N° 29733, Ley de Protección de Datos Personales del Perú, y su reglamento
          (D.S. N° 003-2013-JUS). En el caso de menores de edad, el tratamiento requiere el
          consentimiento del padre, madre o tutor, recabado al momento de la inscripción.</p>

          <p><strong>4. Conservación.</strong> Los datos se conservan mientras la persona mantenga
          vínculo académico con la institución y por el plazo que exija la normativa aplicable;
          luego se eliminan o anonimizan.</p>

          <p><strong>5. Acceso y seguridad.</strong> Solo el personal autorizado accede a los datos
          según su rol. Las contraseñas se almacenan cifradas; el acceso se realiza mediante
          conexión segura (HTTPS).</p>

          <p><strong>6. Derechos (ARCO).</strong> La persona titular puede ejercer sus derechos de
          acceso, rectificación, cancelación y oposición escribiendo a
          <em> [correo de contacto del seminario]</em>.</p>

          <p><strong>7. Cambios.</strong> Esta política puede actualizarse; la versión vigente
          estará siempre disponible en esta misma ventana.</p>

          <p className="privacy__updated">Última actualización: [fecha].</p>
        </div>
      </div>
    </div>
  );
}
```
> Reemplaza `[correo de contacto del seminario]` y `[fecha]` por los datos reales del instituto.

### Uso en el login
```tsx
import { useState } from "react";
import { PrivacyModal } from "./PrivacyModal";
// ...
const [showPrivacy, setShowPrivacy] = useState(false);
// ...
<div className="login__links">
  <button type="button" className="login__legal" onClick={() => setShowPrivacy(true)}>
    Política de privacidad
  </button>
</div>
<PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
```

### CSS del modal y la política
```css
.modal-overlay{
  position:fixed; inset:0; z-index:50;
  display:flex; align-items:center; justify-content:center; padding:20px;
  background:rgba(18,46,42,.45);
  backdrop-filter:blur(2px);
}
.modal{
  background:#fff; border-radius:var(--r-lg); box-shadow:var(--sh-3);
  width:100%; max-width:520px; max-height:80vh; display:flex; flex-direction:column;
}
.privacy__head{
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px; border-bottom:1px solid var(--line);
}
.privacy__body{
  padding:18px 20px; overflow-y:auto;
  font:400 .8rem/1.6 var(--font-body);   /* ← letra pequeña, estándar legal */
  color:var(--ink-soft);
}
.privacy__body p{ margin:0 0 10px; }
.privacy__body strong{ color:var(--ink); }
.privacy__updated{ color:var(--ink-mute); font-size:.74rem; margin-top:6px; }
.login__legal{
  background:none; border:none; cursor:pointer;
  color:var(--pine-600); font:400 .85rem/1 var(--font-body); text-decoration:none;
}
.login__legal:hover{ text-decoration:underline; }
```
> Accesibilidad: el modal cierra con clic fuera, con el botón X y con la tecla `Esc` (agrega un
> listener de teclado), y atrapa el foco mientras está abierto.

---

## Resultado del formulario de login (orden final, de arriba a abajo)

```
[ Cabecera verde:  R  ·  Seminario Teológico de Remanentes ]
[ ───────── franja blanca ───────── ]
        (campo verde oscuro con franjas + puntos)
            ┌───────── tarjeta blanca ─────────┐
            │              PeRTS                │
            │            (logo PeRTS)           │
            │  Correo                           │
            │  [ ✉  nombre@gmail.com         ]  │
            │  Contraseña                       │
            │  [ 🔒  Tu contraseña           ]  │
            │  [        Ingresar             ]  │
            │        Política de privacidad     │  ← abre modal flotante
            └───────────────────────────────────┘
```
(Sin subtítulo, sin lema, sin "Olvidé mi contraseña".)

---

## Verificación

- [ ] Hay una **franja blanca** nítida de ancho completo debajo de la cabecera.
- [ ] **No** aparece "Acceso para estudiantes, profesores y administradores."
- [ ] **No** aparece el lema "The Spiritual Emperor…" en el pie.
- [ ] **No** aparece "Olvidé mi contraseña".
- [ ] El placeholder del correo es **`nombre@gmail.com`**.
- [ ] "Política de privacidad" abre una **ventana flotante** con letra pequeña; cierra con X, clic
      fuera y `Esc`.
- [ ] El texto de la política sigue el formato legal (responsable, datos, finalidad, base legal /
      Ley 29733, conservación, seguridad, derechos ARCO, contacto).
