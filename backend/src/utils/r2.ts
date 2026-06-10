import { env } from "../config/env.js";

let r2Client: import("@aws-sdk/client-s3").S3Client | null = null;

export async function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  const { S3Client } = await import("@aws-sdk/client-s3");

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}
