# Sesión y autenticación (frontend)

> **Contiene:** por qué la sesión se cerraba "sola" de forma inconsistente (o al revés, parecía seguir
> abierta días después mostrando datos vacíos/desactualizados — p.ej. "los cursos desaparecen"), y los
> tres mecanismos que lo corrigen: expiración de sesión por inactividad, middleware que protege las
> páginas, e interceptor que cierra sesión ante un 401 del backend. Leer antes de tocar login, `authOptions`,
> `middleware.ts` o cualquier `fetch` a `/api/backend/*`.

Fecha: 2026-07-26

## 1. El problema original

Había DOS capas de "sesión" independientes y ninguna vencía por inactividad:

```text
1. Cookie de NextAuth (frontend, JWT) -> gobierna si useSession()/getServerSession() ven un usuario.
   Antes: sin `maxAge` configurado -> default de NextAuth = 30 días. Nunca se cerraba sola.
2. Token del backend (`backendToken`, JWT propio, ver auth.service.ts) -> va en el header
   Authorization de cada llamada a /api/backend/*. Vence a las 24h (`tokenExpiresIn`).
```

No había `middleware.ts`: ninguna página redirigía a `/login` aunque la sesión de NextAuth fuera
inválida. Y cuando el `backendToken` (24h) vencía, las rutas `/api/backend/*` devolvían 401 — pero
cada pantalla solo hacía `if (r.ok) setData(...)` sin `else`, así que el 401 se ignoraba en silencio.
Resultado: la sesión "se veía" abierta (la cookie de NextAuth de 30 días seguía viva) pero las
pantallas mostraban listas vacías o datos viejos — el síntoma reportado como "los cursos desaparecen".

## 2. La corrección — tres piezas, cada una resuelve una parte

### 2.1 Expiración de sesión por inactividad (1 hora)

`frontend/src/lib/auth.ts` — `authOptions.session`:

```ts
session: {
  strategy: "jwt",
  maxAge: 60 * 60,   // la cookie vence 1h después del último refresco
  updateAge: 5 * 60, // si hay actividad, se refresca (y se corre el vencimiento) cada 5 min
}
```

Con esto, si el usuario deja de usar la app, la cookie de NextAuth deja de refrescarse y vence sola a
la hora. Si sigue activo (navega, la app llama a `/api/backend/*` cada pocos minutos), la sesión se va
extendiendo. Esto es lo que pidió el cliente: "si no se usa la página en 1h, cerrar sesión".

### 2.2 Middleware que protege TODAS las páginas

`frontend/src/middleware.ts` (nuevo archivo, usa `next-auth/middleware`):

```ts
export default withAuth({ pages: { signIn: "/login" } });
export const config = {
  matcher: ["/((?!api|login|forgot-password|reset-password|privacy|_next/static|_next/image|favicon.ico|brand).*)"],
};
```

Antes, si la cookie de NextAuth vencía (o nunca existió), las páginas protegidas igual se renderizaban
(mostrando el shell vacío o cargando infinito) en vez de mandar al usuario a `/login`. Ahora, en cuanto
la sesión vence (por la regla de la sección 2.1) o no existe, cualquier navegación a una página protegida
redirige automáticamente a `/login?callbackUrl=...`. Las rutas `/api/*` quedan **fuera** del middleware a
propósito: cada route handler (`frontend/src/app/api/backend/**/route.ts`) ya devuelve 401 JSON por su
cuenta si no hay sesión, y si el middleware las interceptara con una redirección, un `fetch()` de una
pantalla recibiría HTML de login donde esperaba JSON.

### 2.3 Interceptor: cualquier 401 de nuestro backend cierra sesión

`frontend/src/components/providers.tsx` — envuelve `window.fetch` una sola vez, a nivel raíz:

```ts
window.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  const url = /* de input */;
  if (response.status === 401 && url.startsWith("/api/backend/")) {
    signOut({ callbackUrl: "/login" });
  }
  return response;
};
```

Esto cubre el caso donde la cookie de NextAuth sigue viva (el usuario está activo) pero el
`backendToken` embebido ya venció (24h) o el backend lo rechaza por otro motivo (usuario desactivado,
etc.). Antes cada pantalla ignoraba el 401 en silencio; ahora cualquier 401 de `/api/backend/*` fuerza
un cierre de sesión limpio y manda a `/login`, en vez de dejar la pantalla con datos vacíos/viejos.

## 3. Qué NO cambió (a propósito)

```text
- El token del backend (`backend/src/services/auth.service.ts`, tokenExpiresIn = "24h") sigue igual.
  Un usuario ACTIVO casi nunca lo va a hacer vencer (la sesión de NextAuth ya lo desloguea a la 1h de
  inactividad); si igual pasara (uso continuo > 24h), el interceptor de la sección 2.3 lo resuelve.
- Cada pantalla (`fetch("/api/backend/...")`) NO se tocó una por una. El interceptor global evita tener
  que salir a editar ~40 llamadas en 12 archivos distintos cada vez que se agregue una pantalla nueva.
```

## 4. Cómo probarlo

```text
1. Sin sesión, entrar directo a una URL protegida (ej. /inicio) -> debe redirigir a /login.
2. Iniciar sesión, dejar la pestaña quieta más de 1h -> al volver a navegar, debe mandar a /login
   (no debe quedar el sidebar visible con datos viejos).
3. Con sesión activa, borrar manualmente la cookie del backend (o esperar a que venza) y navegar ->
   la pantalla debe cerrar sesión sola en vez de mostrar listas vacías.
```
