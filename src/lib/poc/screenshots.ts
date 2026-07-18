export const SESSION_MEDIA_BUCKET = "session-media";

/** Aggregate upload budget for one POC session (matches Final Requirements Spec). */
export const SESSION_BYTE_LIMIT = 50 * 1024 * 1024; // 50 MiB

/** Per-object safety cap (matches Storage bucket file_size_limit). */
export const OBJECT_BYTE_LIMIT = SESSION_BYTE_LIMIT;

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const EXT_BY_MIME: Record<AllowedMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type PocScreenshotRow = {
  id: string;
  user_id: string;
  poc_session_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
};

export type PocScreenshotItem = PocScreenshotRow & {
  signedUrl: string | null;
};

export type UploadBatchFile = {
  name: string;
  type: string;
  size: number;
};

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function extensionForMime(mime: AllowedMimeType): string {
  return EXT_BY_MIME[mime];
}

export function buildStoragePath(
  userId: string,
  pocSessionId: string,
  mediaId: string,
  mime: AllowedMimeType,
): string {
  return `${userId}/${pocSessionId}/${mediaId}.${extensionForMime(mime)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sumByteSizes(
  items: ReadonlyArray<{ byte_size: number }>,
): number {
  return items.reduce((sum, item) => sum + Number(item.byte_size || 0), 0);
}

/**
 * Validate an entire file selection before any Storage/DB writes.
 * Returns a user-facing error string, or null when the batch is acceptable.
 */
export function validateUploadBatch(
  files: ReadonlyArray<UploadBatchFile>,
  existingSessionBytes: number,
): string | null {
  if (files.length === 0) {
    return "No files selected.";
  }

  let batchBytes = 0;

  for (const file of files) {
    if (!file.size || file.size <= 0) {
      return `"${file.name}" is empty. Choose a non-empty image file.`;
    }

    if (!isAllowedMimeType(file.type)) {
      return `Unsupported type "${file.type || "unknown"}" for "${file.name}". Allowed: PNG, JPEG, WebP, GIF.`;
    }

    if (file.size > OBJECT_BYTE_LIMIT) {
      return `"${file.name}" is ${formatBytes(file.size)}, which exceeds the ${formatBytes(OBJECT_BYTE_LIMIT)} per-file limit.`;
    }

    batchBytes += file.size;
  }

  const totalAfter = existingSessionBytes + batchBytes;
  if (totalAfter > SESSION_BYTE_LIMIT) {
    const remaining = Math.max(0, SESSION_BYTE_LIMIT - existingSessionBytes);
    return (
      `This selection (${formatBytes(batchBytes)}) would push the POC session to ` +
      `${formatBytes(totalAfter)}, over the ${formatBytes(SESSION_BYTE_LIMIT)} session limit. ` +
      `Currently used: ${formatBytes(existingSessionBytes)}. Remaining: ${formatBytes(remaining)}.`
    );
  }

  return null;
}
