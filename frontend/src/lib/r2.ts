import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/** Folders the dashboard may upload into (prefixes inside the R2 bucket). */
export const R2_FOLDERS = ["packs", "cards", "franchises"] as const;
export type R2Folder = (typeof R2_FOLDERS)[number];

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are not configured.");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/** Upload an object to the public bucket and return its public URL. */
export async function putPublicImage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicUrl) throw new Error("R2 bucket is not configured.");
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}
