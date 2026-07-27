import { withAuth } from "next-auth/middleware";

// Protege todas las paginas (excepto login/recuperar-contrasena/privacidad y
// assets estaticos). Si la cookie de sesion vencio -> por inactividad
// (maxAge en lib/auth.ts) o porque nunca hubo login -> next-auth redirige a
// /login automaticamente. Las rutas /api/* quedan afuera a proposito: cada
// route handler ya devuelve 401 JSON por su cuenta y el interceptor de
// fetch en components/providers.tsx se encarga de cerrar sesion desde ahi.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api|login|forgot-password|reset-password|privacy|_next/static|_next/image|favicon.ico|brand).*)",
  ],
};
