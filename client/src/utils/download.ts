import { logger } from '@client/src/utils/logger';

export function triggerBlobDownload(
  blob: Blob,
  filename: string,
): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    logger.error(`Failed to trigger download: ${String(err)}`);
    throw err;
  }
}

export function extractFilenameFromHeader(contentDisposition: string | null): string {
  if (!contentDisposition) return 'download';
  const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (matches && matches[1]) {
    const raw = matches[1].replace(/['"]/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return 'download';
}
