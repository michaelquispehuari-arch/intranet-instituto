import { Worker } from "bullmq";
import { captureException } from "../config/sentry.js";
import { emailQueueName, type EmailJobData } from "../queues/email.queue.js";
import { sendEmail } from "../utils/mailer.js";
import {
  disconnectRedis,
  getBullRedisConnectionOptions,
} from "../utils/redis.js";

const worker = new Worker<EmailJobData, void, "send-email">(
  emailQueueName,
  async (job) => {
    await sendEmail(job.data);
  },
  {
    connection: getBullRedisConnectionOptions(),
  },
);

worker.on("completed", (job) => {
  console.log(`Email enviado: job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Email fallido: job ${job?.id ?? "desconocido"}`, error);
  captureException(error);
});

async function shutdown() {
  await worker.close();
  await disconnectRedis();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
