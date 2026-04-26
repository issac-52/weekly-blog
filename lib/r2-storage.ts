import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  mimeType: string,
): Promise<string> {
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: path, Body: buffer, ContentType: mimeType }),
  );
  return path;
}

export async function deleteFromStorage(path: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}
