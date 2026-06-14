import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import { getConfiguredValue } from "./service-config.js";

let r2Client: import("@aws-sdk/client-s3").S3Client | null = null;

export function getR2Config() {
  const accountId = getConfiguredValue(env.CLOUDFLARE_R2_ACCOUNT_ID);
  const accessKeyId = getConfiguredValue(env.CLOUDFLARE_R2_ACCESS_KEY_ID);
  const secretAccessKey = getConfiguredValue(env.CLOUDFLARE_R2_SECRET_ACCESS_KEY);
  const bucketName = getConfiguredValue(env.CLOUDFLARE_R2_BUCKET_NAME);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new HttpError(503, "Almacenamiento de materiales no configurado");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

export async function getR2Client() {
  const config = getR2Config();

  if (r2Client) {
    return r2Client;
  }

  const { S3Client } = await import("@aws-sdk/client-s3");

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

export async function verifyR2BucketAccess() {
  const config = getR2Config();
  const client = await getR2Client();
  const { HeadBucketCommand } = await import("@aws-sdk/client-s3");

  await client.send(
    new HeadBucketCommand({
      Bucket: config.bucketName,
    }),
  );
}
