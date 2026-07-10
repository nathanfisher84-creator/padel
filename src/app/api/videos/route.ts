import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { Role, SubmissionStatus } from "@/lib/constants";
import {
  isVercelBlobUrl,
  MAX_VIDEO_BYTES,
  VIDEO_CONTENT_TYPES,
} from "@/lib/storage";

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

const blobBodySchema = z.object({
  coachId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional(),
  videoUrl: z.string().url(),
});

/**
 * Create a video submission. Requires an entitlement with the chosen coach:
 * an unused one-off credit or headroom on an active subscription.
 *
 * Accepts two shapes:
 *  - multipart/form-data with the video file (local-disk storage mode)
 *  - JSON with a videoUrl the browser already uploaded to Vercel Blob
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.PLAYER) {
    return NextResponse.json({ error: "Player account required." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? createFromBlob(req, session)
    : createFromMultipart(req, session);
}

async function createFromBlob(req: Request, session: SessionUser) {
  const parsed = blobBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { coachId, title, notes, videoUrl } = parsed.data;
  if (!isVercelBlobUrl(videoUrl)) {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }
  return createSubmission(session, coachId, title, notes ?? "", videoUrl);
}

async function createFromMultipart(req: Request, session: SessionUser) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const coachId = String(form.get("coachId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const file = form.get("video");

  if (!coachId || !title || !(file instanceof File)) {
    return NextResponse.json(
      { error: "A coach, a title and a video file are required." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Video must be between 1 byte and 500 MB." },
      { status: 400 }
    );
  }
  if (file.type && !VIDEO_CONTENT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported format. Please upload MP4, MOV, WEBM or AVI." },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).slice(0, 10) || ".mp4";
  const filename = `${crypto.randomUUID()}${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(
    path.join(uploadDir(), filename),
    Buffer.from(await file.arrayBuffer())
  );

  return createSubmission(session, coachId, title, notes, filename);
}

async function createSubmission(
  session: SessionUser,
  coachId: string,
  title: string,
  notes: string,
  videoPath: string
) {
  const entitlement = await getEntitlementForCoach(session.id, coachId);
  if (!entitlement) {
    return NextResponse.json(
      {
        error:
          "No review credit or active subscription with this coach. Purchase one from their profile first.",
      },
      { status: 402 }
    );
  }

  const submission = await db.videoSubmission.create({
    data: {
      playerId: session.id,
      coachId,
      title,
      notes: notes || null,
      videoPath,
      status: SubmissionStatus.AWAITING_FEEDBACK,
      // A one-off credit is consumed by linking the payment to this submission.
      paymentId: entitlement.source === "credit" ? entitlement.paymentId : null,
    },
  });

  return NextResponse.json({ ok: true, id: submission.id });
}
