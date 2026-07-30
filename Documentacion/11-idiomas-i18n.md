# Idiomas (i18n) — español / inglés / coreano

> **Contiene:** cómo funciona el soporte multi-idioma del frontend, dónde viven las traducciones, y qué hacer cada vez que se agrega o cambia un texto en pantalla. Leer antes de tocar cualquier texto visible de una pantalla dentro de `(app)` o del flujo de login.

## Qué es y qué no es

El selector de idioma (ES / English / 한국어) traduce **el texto fijo de la interfaz**: títulos, botones, menús, labels de formulario, mensajes de éxito/error escritos en el frontend. **No es traducción automática** (no usa Google Translate ni ninguna API de traducción) — cada texto tiene su versión en español, inglés y coreano escrita a mano en archivos de diccionario.

Se descartó a propósito el widget de "traducir esta página" de Google porque es conocido por romper aplicaciones React: reescribe el DOM por debajo, y cuando React vuelve a renderizar esa misma parte (algo constante en esta app: abrir un tab, guardar un formulario) la página crashea con un error `removeChild`. Por eso el enfoque es un diccionario estático + un selector propio, sin depender de servicios externos.

**Nunca se traduce:**
- Datos que ingresó un usuario: nombres de alumnos/profesores, nombre de un curso, contenido de preguntas/respuestas de examen, materiales subidos, transcripciones.
- Mensajes de error que vienen del backend (`d.message`, `err.message`, `data.error`) — esos ya vienen armados en español desde Express. Solo se traduce el *fallback* que usa el frontend cuando el backend no manda mensaje (ej. `d.message ?? t("cursos.createForm.genericError")`).

**No tiene traducción** (excluidas del alcance, ver razón en cada caso):
- `frontend/src/app/settings/page.tsx` — huérfana, sin link de navegación (ver nota en [01-partes-del-proyecto.md](./01-partes-del-proyecto.md)).
- `frontend/src/app/privacy/page.tsx` — huérfana, sin link de navegación; duplica el contenido de `PrivacyModal.tsx` (accesible desde el link "Política de privacidad" en el login), que sí está traducido.

## Dónde está el código

```
frontend/src/lib/i18n/
  types.ts                    Locale ("es"|"en"|"ko"), LOCALE_LABELS, INTL_LOCALES (mapeo a "es-PE"/"en-US"/"ko-KR" para fechas)
  LanguageContext.tsx          LanguageProvider (guarda el idioma en localStorage) + hook useTranslation()
  dictionaries/
    es/<modulo>.ts             diccionario en español, uno por módulo/pantalla
    en/<modulo>.ts             mismo shape, en inglés (tipado contra el archivo es/ correspondiente)
    ko/<modulo>.ts             mismo shape, en coreano
    {es,en,ko}/index.ts        junta todos los módulos de ese idioma en un solo objeto
    index.ts                   exporta `dictionaries = { es, en, ko }`

frontend/src/components/LanguageSwitcher.tsx   selector <select> ES/EN/한국어, usado en app-shell.tsx y en login/page.tsx
```

El idioma elegido se guarda en `localStorage` (clave `"idioma"`), **no en el backend** — no existe (ni hace falta) un campo `idioma` en el modelo `Usuario` de Prisma. Al cambiar de idioma también se actualiza `document.documentElement.lang` (accesibilidad).

## Cómo se usa en una pantalla

```tsx
"use client";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function MiPagina() {
  const { t, locale } = useTranslation();
  return <h1>{t("miModulo.titulo")}</h1>;
}
```

- `t("modulo.clave")` busca esa ruta (dot-path) en el diccionario del idioma activo.
- Con interpolación: si el string en el diccionario es `"Hola, {{nombre}}"`, se llama `t("modulo.saludo", { nombre: "Ana" })`.
- Para fechas: **nunca** hardcodear un locale de `Intl.DateTimeFormat`/`toLocaleDateString`/`toLocaleString`. Usar `INTL_LOCALES[locale]`:
  ```tsx
  import { INTL_LOCALES } from "@/lib/i18n/types";
  new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" }).format(fecha)
  ```
- Si la pantalla es un **Server Component** (usa `getServerSession` + `await` directo, sin `"use client"`): no se puede usar `useTranslation()` ahí, porque el idioma solo se conoce en el navegador (`localStorage`). El patrón es crear un componente hermano `<algo>-content.tsx` con `"use client"` que reciba los datos por props y haga el render con `t()` — el `page.tsx` original se limita a hacer el fetch y delegar. Ejemplo real: `frontend/src/app/(app)/inicio/page.tsx` + `inicio-content.tsx`.

## Cómo agregar texto nuevo (o una pantalla nueva)

**Siempre en el mismo cambio, nunca como paso aparte:**

1. Agrega la clave en español en `dictionaries/es/<modulo>.ts` (si el módulo no existe, créalo y agrégalo a `dictionaries/es/index.ts`, `en/index.ts`, `ko/index.ts`).
2. Agrega la misma clave en inglés en `dictionaries/en/<modulo>.ts` y en coreano en `dictionaries/ko/<modulo>.ts` (registro formal 합니다체/습니다체, es una plataforma educativa/institucional).
3. Usa `t("modulo.claveNueva")` en el componente en vez del string literal.
4. Corre `npx tsc --noEmit` — el tipo `Dictionary` (inferido de `es/index.ts`) obliga a que `en`/`ko` tengan exactamente las mismas claves; si falta una, el build falla en vez de mostrar una pantalla a medio traducir.

No hay ningún paso de "traducir después" — quien agrega el texto (la persona o el asistente) escribe las 3 versiones en el mismo momento. Ver también la nota de convención guardada en memoria del asistente (`feedback_i18n_convention`).

## Verificación después de tocar textos/diccionarios

```bash
cd frontend
npx tsc --noEmit -p tsconfig.json   # detecta claves faltantes entre es/en/ko
npm run build                        # build completo, falla si algo quedó roto
```

Y probar visualmente cambiando el selector de idioma en `/login` y dentro de la app ya logueado, revisando que no queden textos en español fijo ni placeholders `{{var}}` sin reemplazar.
