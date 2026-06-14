# Fix: Usuarios, Exámenes y Material dentro del shell

Fecha: 2026-06-14
Objetivo: que /usuarios, /examenes y /material usen el diseño del frontend (shell con sidebar) y redirijan bien.
/usuarios y /examenes hoy se ven con el diseño viejo (fondo blanco). /material da "A server error occurred".

---

## 1. Usuarios -> meterlo dentro del shell

```text
- Mover la ruta a (app)/usuarios para que herede (app)/layout.tsx (sidebar + topbar).
- Quitar cualquier markup o layout propio de fondo blanco / header suelto heredado del layout viejo.
- Usar los componentes y tokens de diseño compartidos (mismo header de página, tarjetas/tabla con la paleta).
- El ítem "Usuarios" del sidebar apunta a /usuarios (dentro del shell) y solo es visible para ADMIN.
```

---

## 2. Exámenes -> meterlo dentro del shell (mismo problema que Usuarios)

```text
- Mover TODAS las rutas de exámenes dentro de (app)/ para que hereden el shell:
    (app)/examenes
    (app)/examenes/create
    (app)/examenes/[id]
    (app)/examenes/[id]/resultados
- Quitar cualquier layout/markup de fondo blanco heredado del layout viejo en esas páginas.
- Usar los componentes y tokens de diseño compartidos (header de página, tarjetas/formularios con la paleta).
- El ítem "Exámenes" del sidebar apunta a /examenes (dentro del shell).
  Visible para PROFESOR y ESTUDIANTE; "Crear examen" solo para PROFESOR/ADMIN.
- Revisar que ninguna de las sub-rutas quede fuera del grupo (app)/: si una queda fuera, vuelve al diseño viejo.
```

---

## 3. Material -> meterlo dentro del shell + que SIEMPRE cargue

### Diseño
```text
- Mover a (app)/material; mismo shell y mismos tokens.
- El ítem "Material" del sidebar apunta a /material (dentro del shell).
```

### Arreglar el error de servidor (debe cargar aunque R2 aún no esté conectado)
```text
Causa típica: el componente de servidor hace fetch a GET /api/content (o al proxy interno) al renderizar,
y si esa llamada falla (backend caído, variable de entorno faltante, o el cliente R2 se inicializa
sin credenciales), la página entera devuelve 500.

Reglas:
- Envolver la carga de datos en try/catch. Si falla, mostrar un estado claro
  ("No se pudo cargar el material" o el vacío "Aún no hay material"). NUNCA dejar que tire 500.
- NO inicializar el cliente R2 al renderizar la página ni al listar. El cliente R2 solo se crea
  en las acciones reales de subir/descargar (mantener el singleton perezoso getR2Client()).
- Listar material (GET /api/content) solo lee PostgreSQL; no debe depender de R2.
- Verificar que BACKEND_URL esté definido en el entorno del servidor (Render) y que el proxy interno
  de Next reciba el token sin exponerlo al navegador.
- Revisar los logs del servidor para ver la excepción exacta que revienta al abrir /material.
```

---

## 4. Qué revisar en el código (para Claude Code)

```text
- ¿/usuarios, /examenes (y sus sub-rutas) o /material están FUERA de (app)/?
  Si lo están, heredan el layout viejo -> moverlos dentro.
- ¿Queda algún layout.tsx o page.tsx que importe estilos/markup del dashboard viejo (fondo blanco)? Quitarlo.
- ¿El fetch de /material maneja el error? Si no, agregar try/catch + estado vacío/erróneo.
- ¿Algún import del SDK de R2/AWS se ejecuta a nivel de módulo en esa ruta? Hacerlo perezoso (solo en la acción).
- ¿Los enlaces del sidebar a Usuarios, Exámenes y Material apuntan a las rutas in-shell y no a rutas viejas?
```

---

## 5. Hecho cuando

```text
[ ] /usuarios se ve con el shell (sidebar verde), no con fondo blanco.
[ ] /examenes y todas sus sub-rutas (create, [id], resultados) se ven con el shell, no con fondo blanco.
[ ] /material carga sin error, dentro del shell, y muestra la lista o un vacío claro
    aunque R2 todavía no esté conectado.
[ ] Los ítems "Usuarios", "Exámenes" y "Material" del sidebar redirigen a sus rutas in-shell
    y solo aparecen para los roles correctos.
[ ] frontend: typecheck y build OK.
```
