"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

// Igual al updateAge de authOptions.session en lib/auth.ts: no tiene sentido
// refrescar la cookie de sesion mas seguido que eso.
const SESSION_REFRESH_THROTTLE_MS = 5 * 60 * 1000;

// Si el backend rechaza el token (vencido, usuario desactivado, etc.) las
// rutas /api/backend/* devuelven 401. Antes cada pantalla solo hacia
// `if (r.ok) ...` y ese 401 se ignoraba en silencio: la sesion parecia
// seguir abierta pero mostraba datos vacios o desactualizados (p.ej. los
// cursos "desaparecian"). Este interceptor detecta cualquier 401 de nuestro
// propio backend y fuerza el cierre de sesion + redirect a /login.
//
// Tambien renueva la sesion ante cualquier llamada al backend que responda
// bien. Por defecto next-auth solo renueva la cookie cuando la pestaña
// recupera el foco (useSession la refetchea en window focus) — no cuando el
// usuario realmente usa la app. Eso permitia que una pestaña abierta en
// segundo plano (sin usarla) se mantuviera "viva" indefinidamente con solo
// volver a enfocarla de vez en cuando, sin ninguna interaccion real con la
// intranet. Ahora la actividad real es la unica que cuenta.
function useSessionKeepAlive() {
  const { update } = useSession();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch;
    let loggingOut = false;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith("/api/backend/")) {
        if (response.status === 401 && !loggingOut) {
          loggingOut = true;
          void signOut({ callbackUrl: "/login" });
        } else if (response.ok) {
          const now = Date.now();
          if (now - lastRefreshRef.current > SESSION_REFRESH_THROTTLE_MS) {
            lastRefreshRef.current = now;
            void update();
          }
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [update]);
}

function SessionKeepAlive({ children }: { children: React.ReactNode }) {
  useSessionKeepAlive();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionKeepAlive>{children}</SessionKeepAlive>
    </SessionProvider>
  );
}
