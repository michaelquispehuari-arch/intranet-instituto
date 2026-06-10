import { env } from "../config/env.js";
import { prisma } from "../utils/prisma.js";
import { getRedisClient } from "../utils/redis.js";
import { isConfiguredRedisUrl, isConfiguredValue } from "../utils/service-config.js";

type ServiceStatus = {
  status: "ok" | "missing" | "error";
  message?: string;
};

function isR2Configured() {
  return Boolean(
    isConfiguredValue(env.CLOUDFLARE_R2_ACCOUNT_ID) &&
      isConfiguredValue(env.CLOUDFLARE_R2_ACCESS_KEY_ID) &&
      isConfiguredValue(env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) &&
      isConfiguredValue(env.CLOUDFLARE_R2_BUCKET_NAME),
  );
}

function isSmtpConfigured() {
  return Boolean(
    isConfiguredValue(env.SMTP_HOST) &&
      isConfiguredValue(env.SMTP_USER) &&
      isConfiguredValue(env.SMTP_PASS),
  );
}

async function checkPostgres(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch {
    return { status: "error", message: "PostgreSQL no responde" };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  if (!isConfiguredRedisUrl(env.REDIS_URL)) {
    return { status: "missing", message: "Redis no configurado" };
  }

  try {
    const pong = await getRedisClient().ping();
    return pong === "PONG"
      ? { status: "ok" }
      : { status: "error", message: "Redis respondio de forma inesperada" };
  } catch {
    return { status: "error", message: "Redis no responde" };
  }
}

export async function getReadinessStatus() {
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const services = {
    postgres,
    redis,
    r2: isR2Configured()
      ? { status: "ok" as const }
      : { status: "missing" as const, message: "Cloudflare R2 no configurado" },
    smtp: isSmtpConfigured()
      ? { status: "ok" as const }
      : { status: "missing" as const, message: "SMTP no configurado" },
    sentry: env.SENTRY_DSN
      ? { status: "ok" as const }
      : { status: "missing" as const, message: "Sentry no configurado" },
  };

  const ready = Object.values(services).every((service) => service.status === "ok");

  return {
    status: ready ? "ready" : "degraded",
    services,
  };
}
