import { createAdminClient } from './supabase/admin';

const BUCKET = 'meter-images';

export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  mimeType: string,
): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw error;
  return path;
}

export async function deleteFromStorage(path: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]);
}
