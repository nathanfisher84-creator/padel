import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { Role, SubmissionStatus } from "@/lib/constants";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
]);

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/**
 * Upload a training video for review. Requires an entitlement with the chosen
 * coach: an unused one-off credit or headroom on an active subscription.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.PLAYER) {
    return NextResponse.json({ error: "Player account required." }, { status: 403 });
  }

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
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Video must be between 1 byte and 500 MB." },
      { status: 400 }
    );
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported format. Please upload MP4, MOV, WEBM or AVI." },
      { status: 400 }
    );
  }

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

  const ext = path.extname(file.name).slice(0, 10) || ".mp4";
  const filename = `${crypto.randomUUID()}${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(
    path.join(uploadDir(), filename),
    Buffer.from(await file.arrayBuffer())
  );

  const submission = await db.videoSubmission.create({
    data: {
      playerId: session.id,
      coachId,
      title,
      notes: notes || null,
      videoPath: filename,
      status: SubmissionStatus.AWAITING_FEEDBACK,
      // A one-off credit is consumed by linking the payment to this submission.
      paymentId: entitlement.source === "credit" ? entitlement.paymentId : null,
    },
  });

  return NextResponse.json({ ok: true, id: submission.id });
}
