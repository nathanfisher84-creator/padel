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

export function blobUploadsEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export const VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

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
