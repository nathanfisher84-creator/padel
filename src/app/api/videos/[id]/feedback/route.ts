import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role, SubmissionStatus } from "@/lib/constants";
import { redactContact } from "@/lib/redact";
import { notifyPlayerFeedbackDelivered } from "@/lib/email";
import {
  blobUploadsEnabled,
  isVercelBlobUrl,
  VIDEO_CONTENT_TYPES,
  MAX_VIDEO_BYTES,
} from "@/lib/storage";

const bodySchema = z.object({
  content: z.string().trim().min(10).max(10000),
  // Set when the coach recorded a video reply and uploaded it to Blob.
  videoUrl: z.string().url().optional(),
});

/**
 * A coach posts feedback on a submission in their review queue: written
 * notes, optionally with a video reply.
 *
 * Accepts JSON ({ content, videoUrl? }) or multipart/form-data with a
 * `video` file (local-disk storage mode).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let content: string;
  let videoUrl: string | null = null;
  let videoFile: File | null = null;

  if (contentType.includes("application/json")) {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Feedback must be at least 10 characters." },
        { status: 400 }
      );
    }
    content = parsed.data.content;
    if (parsed.data.videoUrl) {
      if (!isVercelBlobUrl(parsed.data.videoUrl)) {
        return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
      }
      videoUrl = parsed.data.videoUrl;
    }
  } else {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }
    content = String(form.get("content") ?? "").trim();
    if (content.length < 10) {
      return NextResponse.json(
        { error: "Feedback must be at least 10 characters." },
        { status: 400 }
      );
    }
    const file = form.get("video");
    if (file instanceof File && file.size > 0) {
      if (blobUploadsEnabled()) {
        return NextResponse.json(
          { error: "Upload the video directly, then send its URL." },
          { status: 400 }
        );
      }
      if (!VIDEO_CONTENT_TYPES.includes(file.type) || file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: "Video must be MP4, MOV, WEBM or AVI, under 500 MB." },
          { status: 400 }
        );
      }
      videoFile = file;
    }
  }

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
    include: { feedback: true, player: { select: { email: true, name: true } } },
  });
  if (!submission || submission.coachId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.feedback) {
    return NextResponse.json(
      { error: "Feedback has already been given." },
      { status: 409 }
    );
  }

  if (videoFile) {
    const ext =
      videoFile.type === "video/quicktime" ? "mov" : videoFile.type.split("/")[1];
    const name = `${submission.id}-feedback-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const dir = path.join(
      process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"),
      "media"
    );
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await videoFile.arrayBuffer()));
    videoUrl = `/api/media/${name}`;
  }

  await db.$transaction([
    db.feedback.create({
      data: { submissionId: submission.id, content: redactContact(content), videoUrl },
    }),
    db.videoSubmission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.REVIEWED },
    }),
  ]);

  // Best-effort; the feedback is already saved.
  await notifyPlayerFeedbackDelivered({
    playerEmail: submission.player.email,
    playerName: submission.player.name,
    coachName: session.name,
    title: submission.title,
    submissionId: submission.id,
    isAi: false,
  });

  return NextResponse.json({ ok: true });
}
