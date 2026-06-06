import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Usuario } from "@prisma/client";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";
import { UnauthorizedError } from "../utils/http-error.js";
import { prisma } from "../utils/prisma.js";

const tokenExpiresIn = "24h";

function toAuthUser(user: Usuario): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellido: user.apellido,
    rol: user.rol,
  };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.usuario.findUnique({
    where: { email: input.email },
  });

  if (!user || !user.activo) {
    throw new UnauthorizedError();
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError();
  }

  const authUser = toAuthUser(user);
  const token = jwt.sign(
    {
      email: authUser.email,
      role: authUser.rol,
    },
    env.JWT_SECRET,
    {
      subject: authUser.id,
      expiresIn: tokenExpiresIn,
    },
  );

  return { token, user: authUser };
}

export async function findActiveUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.usuario.findFirst({
    where: {
      id: userId,
      activo: true,
    },
  });

  return user ? toAuthUser(user) : null;
}
