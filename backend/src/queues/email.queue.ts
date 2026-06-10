import { Queue } from "bullmq";
import { getBullRedisConnectionOptions } from "../utils/redis.js";

export type EmailJobData = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const emailQueueName = "email";

let emailQueue: Queue<EmailJobData, void, "send-email"> | null = null;

export function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData, void, "send-email">(emailQueueName, {
      connection: getBullRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  return emailQueue;
}

export async function enqueueEmail(data: EmailJobData) {
  const queue = getEmailQueue();
  await queue.add("send-email", data);
}
