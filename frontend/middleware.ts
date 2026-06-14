import { withAuth } from "next-auth/middleware";

const roleAccess: Record<string, Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE">> = {
  "/inicio": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/dashboard": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/courses": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/cursos": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/exams/create": ["ADMIN", "PROFESOR"],
  "/exams": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/content/upload": ["ADMIN", "PROFESOR"],
  "/content": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/grades": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/calificaciones": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/users": ["ADMIN"],
  "/settings": ["ADMIN"],
  "/configuracion": ["ADMIN"],
  "/sustitutorios": ["ADMIN"],
};

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ req, token }) {
      if (!token?.user) {
        return false;
      }

      const pathname = req.nextUrl.pathname;
      const rule = Object.entries(roleAccess).find(([path]) => pathname.startsWith(path));

      if (!rule) {
        return true;
      }

      return rule[1].includes(token.user.rol);
    },
  },
});

export const config = {
  matcher: [
    "/inicio/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/cursos/:path*",
    "/exams/:path*",
    "/content/:path*",
    "/grades/:path*",
    "/calificaciones/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/configuracion/:path*",
    "/sustitutorios/:path*",
  ],
};
