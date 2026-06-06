import type { Rol } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
};
