import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
};

/**
 * Serves coach profile media (photos, intro videos) from local disk. Only
 * used in local-disk storage mode — on Vercel these live at public Blob
 * URLs. Profile media is public marketplace content, so no auth check.
 */
export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  // The [name] segment cannot contain "/", but be explicit about traversal.
  const name = path.basename(params.name);
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type = CONTENT_TYPES[ext];
  if (!type) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const filePath = path.join(
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
    "media",
    name
  );
  try {
    const info = await stat(filePath);
    const stream = Readable.toWeb(
      createReadStream(filePath)
    ) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
