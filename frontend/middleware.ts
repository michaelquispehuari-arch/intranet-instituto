import { withAuth } from "next-auth/middleware";

const roleAccess: Record<string, Array<"ADMIN" | "PROFESOR" | "ESTUDIANTE">> = {
  "/dashboard": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/courses": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/exams/create": ["PROFESOR"],
  "/exams": ["PROFESOR", "ESTUDIANTE"],
  "/content/upload": ["PROFESOR"],
  "/content": ["PROFESOR", "ESTUDIANTE"],
  "/grades": ["ADMIN", "PROFESOR", "ESTUDIANTE"],
  "/users": ["ADMIN"],
  "/settings": ["ADMIN"],
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
  matcher: ["/dashboard/:path*", "/courses/:path*", "/exams/:path*", "/content/:path*", "/grades/:path*", "/users/:path*", "/settings/:path*"],
};
