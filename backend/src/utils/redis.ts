import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import { cleanConfigValue, isConfiguredRedisUrl } from "./service-config.js";

let redisClient: Redis | null = null;

export function getRedisClient() {
  assertRedisConfig();

  if (!redisClient) {
    redisClient = new Redis(cleanConfigValue(env.REDIS_URL), {
      maxRetriesPerRequest: null,
    });
  }

  return redisClient;
}

export async function disconnectRedis() {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}

export function getBullRedisConnectionOptions(): ConnectionOptions {
  assertRedisConfig();

  const redisUrl = new URL(cleanConfigValue(env.REDIS_URL));
  const db = redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) : 0;

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
    password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    db: Number.isNaN(db) ? 0 : db,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

export function assertRedisConfig() {
  if (!isConfiguredRedisUrl(env.REDIS_URL)) {
    throw new HttpError(503, "Redis no configurado");
  }
}
