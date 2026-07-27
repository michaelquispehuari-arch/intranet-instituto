"use client";

import { SessionProvider, signOut } from "next-auth/react";
import { useEffect } from "react";

// Si el backend rechaza el token (vencido, usuario desactivado, etc.) las
// rutas /api/backend/* devuelven 401. Antes cada pantalla solo hacia
// `if (r.ok) ...` y ese 401 se ignoraba en silencio: la sesion parecia
// seguir abierta pero mostraba datos vacios o desactualizados (p.ej. los
// cursos "desaparecian"). Este interceptor detecta cualquier 401 de nuestro
// propio backend y fuerza el cierre de sesion + redirect a /login.
function useAutoLogoutOn401() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let loggingOut = false;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (response.status === 401 && url.startsWith("/api/backend/") && !loggingOut) {
        loggingOut = true;
        void signOut({ callbackUrl: "/login" });
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useAutoLogoutOn401();
  return <SessionProvider>{children}</SessionProvider>;
}
