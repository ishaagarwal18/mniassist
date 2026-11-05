import { SalesExportFormat } from '../../proxy/sales/sales-enums';

/** The extension a downloaded sales file gets, from what the server sent. */
export function exportExtension(blob: Blob, format: SalesExportFormat): string {
  if (blob.type.includes('html')) return 'html';
  if (blob.type.includes('spreadsheet') || format === SalesExportFormat.Excel) return 'xlsx';
  return 'pdf';
}

/** A file name without characters Windows refuses. */
export const safeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document';

/** The server's message from a failed blob request (its error body arrives as a Blob, not JSON). */
export async function blobErrorMessage(e: unknown, fallback: string): Promise<string> {
  const body = (e as { error?: unknown })?.error;
  try {
    const parsed =
      body instanceof Blob ? JSON.parse(await body.text()) : (body as { error?: unknown });
    const message = (parsed as { error?: { message?: string } })?.error?.message;
    return message && message.length < 400 ? message : fallback;
  } catch {
    return fallback;
  }
}
