import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import type { Rol } from "@prisma/client";
import { env } from "../config/env.js";
import { enqueueEmail } from "../queues/email.queue.js";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../schemas/auth.schema.js";
import type { AuthUser } from "../types/auth.js";
import { HttpError, UnauthorizedError } from "../utils/http-error.js";
import { assertSmtpConfig } from "../utils/mailer.js";
import { prisma } from "../utils/prisma.js";
import { getRedisClient } from "../utils/redis.js";

const tokenExpiresIn = "24h";
const passwordResetTtlSeconds = 60 * 60;
const passwordResetResponse = {
  message: "Si el email existe, se enviara un enlace de recuperacion",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type LoginUser = {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
};

function toAuthUser(user: LoginUser): AuthUser {
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
    select: {
      id: true,
      email: true,
      passwordHash: true,
      nombre: true,
      apellido: true,
      rol: true,
      activo: true,
    },
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

export async function requestPasswordReset(input: ForgotPasswordInput) {
  assertSmtpConfig();

  const user = await prisma.usuario.findFirst({
    where: {
      email: input.email,
      activo: true,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
    },
  });

  if (!user) {
    return passwordResetResponse;
  }

  const token = randomBytes(32).toString("hex");
  const resetUrl = new URL("/reset-password", env.FRONTEND_URL);
  resetUrl.searchParams.set("token", token);
  const safeName = escapeHtml(user.nombre);

  await getRedisClient().set(`reset:${token}`, user.id, "EX", passwordResetTtlSeconds);

  await enqueueEmail({
    to: user.email,
    subject: "Recuperacion de contrasena",
    text: [
      `Hola ${user.nombre}.`,
      "Usa este enlace para crear una nueva contrasena:",
      resetUrl.toString(),
      "El enlace vence en 1 hora.",
    ].join("\n\n"),
    html: [
      `<p>Hola ${safeName}.</p>`,
      `<p>Usa este enlace para crear una nueva contrasena:</p>`,
      `<p><a href="${resetUrl.toString()}">Restablecer contrasena</a></p>`,
      `<p>El enlace vence en 1 hora.</p>`,
    ].join(""),
  });

  return passwordResetResponse;
}

export async function resetPassword(input: ResetPasswordInput) {
  const userId = await getRedisClient().call("GETDEL", `reset:${input.token}`);

  if (typeof userId !== "string") {
    throw new HttpError(400, "Token invalido o expirado");
  }

  const user = await prisma.usuario.findFirst({
    where: {
      id: userId,
      activo: true,
    },
    select: { id: true },
  });

  if (!user) {
    throw new HttpError(400, "Token invalido o expirado");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  await prisma.usuario.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { message: "Contrasena actualizada" };
}
