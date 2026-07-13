import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
};

/** Stream a submission's video. Only the player, their coach, or an admin. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
  });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed =
    session.id === submission.playerId ||
    session.id === submission.coachId ||
    session.role === Role.ADMIN;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (submission.videoPurgedAt) {
    return NextResponse.json(
      { error: "This video was removed after the review was delivered." },
      { status: 410 }
    );
  }

  // Blob-stored videos (Vercel) live at an unguessable CDN URL; after the
  // access check above, hand the browser off to it rather than proxying
  // hundreds of megabytes through a serverless function.
  if (submission.videoPath.startsWith("https://")) {
    return NextResponse.redirect(submission.videoPath);
  }

  // videoPath is a server-generated UUID filename; resolve defensively anyway.
  const filePath = path.join(uploadDir(), path.basename(submission.videoPath));
  try {
    const info = await stat(filePath);
    const stream = Readable.toWeb(
      createReadStream(filePath)
    ) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] ?? "video/mp4",
        "Content-Length": String(info.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "Video file missing" }, { status: 404 });
  }
}
