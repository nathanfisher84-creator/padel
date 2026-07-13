// Video storage backend detection.
//
// Two modes:
//  - Local disk (default): videos are written to UPLOAD_DIR and streamed
//    through /api/videos/[id]/stream. Used in development / on any host
//    with a persistent disk.
//  - Vercel Blob: enabled automatically when BLOB_READ_WRITE_TOKEN is set
//    (Vercel adds it when a Blob store is connected). The browser uploads
//    straight to Blob storage — required on Vercel, where serverless
//    request bodies are capped at ~4.5 MB — and the submission stores the
//    blob URL.

/**
 * Find the Blob read-write token, whatever the env var is called. Vercel
 * names it BLOB_READ_WRITE_TOKEN by default, but connecting a store with a
 * custom "environment variables prefix" produces e.g.
 * PADEL_BLOB_READ_WRITE_TOKEN — accept any *_READ_WRITE_TOKEN that holds a
 * Vercel Blob token.
 */
export function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const entry = Object.entries(process.env).find(
    ([key, value]) =>
      key.endsWith("_READ_WRITE_TOKEN") && value?.startsWith("vercel_blob_rw_")
  );
  return entry?.[1];
}

/** Name of the env var the Blob token was found under (for diagnostics). */
export function blobTokenVarName(): string | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  const entry = Object.entries(process.env).find(
    ([key, value]) =>
      key.endsWith("_READ_WRITE_TOKEN") && value?.startsWith("vercel_blob_rw_")
  );
  return entry?.[0] ?? null;
}

/**
 * Blob is usable with either auth mode:
 *  - a static read-write token (legacy; any env-var prefix), or
 *  - OIDC: connecting a store injects BLOB_STORE_ID and the SDK
 *    authenticates with the deployment's VERCEL_OIDC_TOKEN automatically.
 */
export function blobAuthMode(): "rw-token" | "oidc" | null {
  if (blobToken()) return "rw-token";
  if (process.env.BLOB_STORE_ID) return "oidc";
  return null;
}

export function blobUploadsEnabled(): boolean {
  return blobAuthMode() !== null;
}

export const VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

// 1 GB — roughly a full match filmed at 1080p. The AI pipeline buffers the
// whole file in a serverless function on its way to Gemini, so keep this
// at or below ~1 GB unless that path is converted to streaming.
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;

// How long a raw video file is kept after its review is delivered before the
// retention cron deletes it. Referenced by the cron, the upload form, the
// submission page and the privacy policy — change it here only.
export const VIDEO_RETENTION_DAYS = 30;

// Coach profile media
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_INTRO_SECONDS = 5 * 60; // intro video length cap

/** Only accept blob URLs that actually point at Vercel Blob storage. */
export function isVercelBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}
