import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken: string;
    user: DefaultSession["user"] & {
      id: string;
      nombre: string;
      apellido: string;
      rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
    };
  }

  interface User {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
    backendToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    user?: {
      id: string;
      email: string;
      nombre: string;
      apellido: string;
      rol: "ADMIN" | "PROFESOR" | "ESTUDIANTE";
    };
  }
}
