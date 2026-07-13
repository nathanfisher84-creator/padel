import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";
import {
  blobUploadsEnabled,
  blobToken,
  isVercelBlobUrl,
  IMAGE_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  VIDEO_CONTENT_TYPES,
  MAX_VIDEO_BYTES,
} from "@/lib/storage";

function mediaDir(): string {
  return path.join(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"), "media");
}

const blobBodySchema = z.object({ introVideoUrl: z.string().url() });

/**
 * Set a coach's profile media: photo (selfie or upload) and intro video.
 *
 * Accepts two shapes:
 *  - multipart/form-data with a `photo` image and/or `video` file. Photos are
 *    small enough to pass through the function in both storage modes; video
 *    files this way only in local-disk mode.
 *  - JSON { introVideoUrl } after the browser uploaded the intro video
 *    directly to Vercel Blob (via /api/videos/upload-token).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }
  const profile = await db.coachProfile.findUnique({ where: { userId: session.id } });
  if (!profile) {
    return NextResponse.json({ error: "Coach profile not found." }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = blobBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !isVercelBlobUrl(parsed.data.introVideoUrl)) {
      return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
    }
    const updated = await db.coachProfile.update({
      where: { userId: session.id },
      data: { introVideoUrl: parsed.data.introVideoUrl },
    });
    return NextResponse.json({ photoUrl: updated.photoUrl, introVideoUrl: updated.introVideoUrl });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }
  const photo = form.get("photo");
  const video = form.get("video");
  const data: { photoUrl?: string; introVideoUrl?: string } = {};

  if (photo instanceof File) {
    if (!IMAGE_CONTENT_TYPES.includes(photo.type)) {
      return NextResponse.json(
        { error: "Profile photo must be a JPEG, PNG or WebP image." },
        { status: 400 }
      );
    }
    if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Profile photo must be under 5 MB." },
        { status: 400 }
      );
    }
    data.photoUrl = await store(photo, `${session.id}-photo`, "jpg");
  }

  if (video instanceof File) {
    if (blobUploadsEnabled()) {
      return NextResponse.json(
        { error: "Upload the intro video directly, then register its URL." },
        { status: 400 }
      );
    }
    if (!VIDEO_CONTENT_TYPES.includes(video.type)) {
      return NextResponse.json(
        { error: "Intro video must be MP4, MOV, WEBM or AVI." },
        { status: 400 }
      );
    }
    if (video.size === 0 || video.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: "Intro video must be under 1 GB." },
        { status: 400 }
      );
    }
    const ext = video.type === "video/quicktime" ? "mov" : video.type.split("/")[1];
    data.introVideoUrl = await store(video, `${session.id}-intro`, ext);
  }

  if (!data.photoUrl && !data.introVideoUrl) {
    return NextResponse.json({ error: "Attach a photo or a video." }, { status: 400 });
  }

  const updated = await db.coachProfile.update({ where: { userId: session.id }, data });
  return NextResponse.json({ photoUrl: updated.photoUrl, introVideoUrl: updated.introVideoUrl });
}

/** Store a file in Vercel Blob (production) or on local disk (development). */
async function store(file: File, stem: string, ext: string): Promise<string> {
  if (blobUploadsEnabled()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`coach-media/${stem}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      token: blobToken(),
    });
    return blob.url;
  }
  const name = `${stem}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  await mkdir(mediaDir(), { recursive: true });
  await writeFile(path.join(mediaDir(), name), Buffer.from(await file.arrayBuffer()));
  return `/api/media/${name}`;
}
