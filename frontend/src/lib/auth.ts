import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "./env";

type BackendLoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
  };
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Cierre de sesion por inactividad: si pasa 1h sin actividad (sin que se
    // refresque el token) la cookie vence y el middleware manda a /login.
    // updateAge mas chico que maxAge permite que el uso activo vaya
    // extendiendo la sesion en vez de cortarla a la hora exacta del login.
    maxAge: 60 * 60,
    updateAge: 5 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const response = await fetch(`${env.BACKEND_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as BackendLoginResponse;

        return {
          ...data.user,
          backendToken: data.token,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.backendToken = user.backendToken;
        token.user = {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
        };
      }

      return token;
    },
    session({ session, token }) {
      if (!token.backendToken || !token.user) {
        return session;
      }

      // backendToken se queda solo en el JWT (cookie httpOnly), nunca se copia a `session`
      // para que no viaje al navegador via useSession()/getSession(). El backend lo lee
      // con getBackendToken() (frontend/src/lib/backend.ts) usando next-auth/jwt.getToken().
      session.user = {
        ...session.user,
        ...token.user,
      };

      return session;
    },
  },
};
