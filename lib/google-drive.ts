import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });
}

export async function uploadToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id',
    supportsAllDrives: true,
  });

  const fileId = data.id!;

  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return fileId;
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.delete({ fileId });
}

export function getDriveThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
