import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { reviewDueAt } from "@/lib/deadlines";
import { redactContact } from "@/lib/redact";
import {
  Role,
  SubmissionStatus,
  FOCUS_SHOT_KEYS,
  PLAYER_SIDE_KEYS,
} from "@/lib/constants";
import {
  isVercelBlobUrl,
  MAX_VIDEO_BYTES,
  VIDEO_CONTENT_TYPES,
} from "@/lib/storage";
import { notifyCoachNewSubmission, notifyOwnerAiUpload } from "@/lib/email";

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

const blobBodySchema = z.object({
  coachId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional(),
  playerOutfit: z.string().trim().min(1).max(80),
  playerSide: z
    .string()
    .refine((v) => (PLAYER_SIDE_KEYS as string[]).includes(v))
    .optional(),
  playerRefPoint: z.string().max(20).optional(),
  playerRefImage: z.string().max(400_000).optional(),
  videoUrl: z.string().url(),
  focusShots: z.array(z.string()).max(12).optional(),
});

/**
 * Validate the tap-to-identify reference: a normalised "x,y" point and a
 * small JPEG data URL cropped from the opening frame. Both invalid → nulls
 * (the reference is an enhancement, never a reason to reject an upload).
 */
function cleanPlayerRef(
  point: string | undefined | null,
  image: string | undefined | null
): { point: string | null; image: string | null } {
  let cleanPoint: string | null = null;
  if (point) {
    const [x, y] = String(point).split(",").map(Number);
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      cleanPoint = `${Math.round(x * 1000) / 1000},${Math.round(y * 1000) / 1000}`;
    }
  }
  const cleanImage =
    image &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) &&
    image.length <= 400_000
      ? image
      : null;
  return { point: cleanPoint, image: cleanImage };
}

/** Keep only known shot keys, comma-joined for storage. */
function cleanShots(shots: string[] | undefined | null): string | null {
  const valid = (shots ?? []).filter((s) => (FOCUS_SHOT_KEYS as string[]).includes(s));
  return valid.length ? valid.join(",") : null;
}

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
  const focusShots = cleanShots(parsed.data.focusShots);
  if (!isVercelBlobUrl(videoUrl)) {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }
  return createSubmission(session, coachId, title, notes ?? "", videoUrl, focusShots, {
    outfit: parsed.data.playerOutfit,
    side: parsed.data.playerSide ?? null,
    ref: cleanPlayerRef(parsed.data.playerRefPoint, parsed.data.playerRefImage),
  });
}

async function createFromMultipart(req: Request, session: SessionUser) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const coachId = String(form.get("coachId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const focusShots = cleanShots(form.getAll("focusShots").map(String));
  const playerOutfit = String(form.get("playerOutfit") ?? "").trim().slice(0, 80);
  const rawSide = String(form.get("playerSide") ?? "");
  const playerSide = (PLAYER_SIDE_KEYS as string[]).includes(rawSide) ? rawSide : null;
  const file = form.get("video");

  if (!coachId || !title || !playerOutfit || !(file instanceof File)) {
    return NextResponse.json(
      { error: "A coach, a title, who you are in the video, and a video file are required." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Video must be between 1 byte and 1 GB." },
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

  return createSubmission(session, coachId, title, notes, filename, focusShots, {
    outfit: playerOutfit,
    side: playerSide,
    ref: cleanPlayerRef(
      form.get("playerRefPoint") ? String(form.get("playerRefPoint")) : null,
      form.get("playerRefImage") ? String(form.get("playerRefImage")) : null
    ),
  });
}

async function createSubmission(
  session: SessionUser,
  coachId: string,
  title: string,
  notes: string,
  videoPath: string,
  focusShots: string | null,
  identity: {
    outfit: string;
    side: string | null;
    ref: { point: string | null; image: string | null };
  }
) {
  const coach = await db.user.findUnique({
    where: { id: coachId },
    select: {
      email: true,
      name: true,
      coachProfile: {
        select: { isAi: true, isPublished: true, turnaroundHours: true },
      },
    },
  });
  if (!coach?.coachProfile?.isPublished) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }

  // Every review — human or AI — requires a credit or subscription. Nova's
  // chat is the free tier; watching a full video is the paid one.
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
      playerOutfit: redactContact(identity.outfit),
      playerSide: identity.side,
      playerRefPoint: identity.ref.point,
      playerRefImage: identity.ref.image,
      focusShots,
      videoPath,
      status: SubmissionStatus.AWAITING_FEEDBACK,
      // A one-off credit is consumed by linking the payment to this submission.
      paymentId: entitlement.source === "credit" ? entitlement.paymentId : null,
    },
  });

  // Notify (best-effort, never fails the upload): a human coach gets the
  // new-video email; an AI submission alerts the owner instead — the AI
  // review itself is kicked off by the player's submission page.
  if (coach?.coachProfile?.isAi) {
    await notifyOwnerAiUpload({
      playerName: session.name,
      title,
      submissionId: submission.id,
    });
  } else if (coach) {
    await notifyCoachNewSubmission({
      coachEmail: coach.email,
      coachName: coach.name,
      playerName: session.name,
      title,
      submissionId: submission.id,
      turnaroundHours: coach.coachProfile.turnaroundHours,
      dueAt: reviewDueAt(submission.createdAt, coach.coachProfile.turnaroundHours),
    });
  }

  return NextResponse.json({ ok: true, id: submission.id });
}
