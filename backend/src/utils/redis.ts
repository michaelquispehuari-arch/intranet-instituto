import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env.js";

let redisClient: Redis | null = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
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
  const redisUrl = new URL(env.REDIS_URL);
  const db = redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) : 0;

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
    password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    db: Number.isNaN(db) ? 0 : db,
    maxRetriesPerRequest: null,
  };
}
