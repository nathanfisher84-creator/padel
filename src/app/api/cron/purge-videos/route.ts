import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { SubmissionStatus } from "@/lib/constants";
import { blobToken, isVercelBlobUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Keep raw video files this long after the review was delivered, then delete
// them to keep storage costs flat. The written feedback and timestamped notes
// are database rows and are kept forever.
const RETENTION_DAYS = 30;
const BATCH = 50;

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/**
 * Storage retention cron (scheduled daily via vercel.json). Deletes the raw
 * video file of submissions whose review was delivered more than
 * RETENTION_DAYS ago — from Vercel Blob or local disk — and stamps
 * videoPurgedAt so streams return 410 and the UI explains the removal.
 *
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token). Without the
 * env var the route only runs outside production, so a misconfigured deploy
 * fails safe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const due = await db.videoSubmission.findMany({
    where: {
      status: SubmissionStatus.REVIEWED,
      videoPurgedAt: null,
      feedback: { createdAt: { lt: cutoff } },
    },
    select: { id: true, videoPath: true },
    take: BATCH,
  });

  let purged = 0;
  const errors: string[] = [];
  for (const sub of due) {
    try {
      if (isVercelBlobUrl(sub.videoPath)) {
        const { del } = await import("@vercel/blob");
        await del(sub.videoPath, { token: blobToken() });
      } else if (!sub.videoPath.startsWith("https://")) {
        // Local-disk file; already-missing files count as deleted.
        await unlink(path.join(uploadDir(), path.basename(sub.videoPath))).catch(
          (err: NodeJS.ErrnoException) => {
            if (err.code !== "ENOENT") throw err;
          }
        );
      }
      await db.videoSubmission.update({
        where: { id: sub.id },
        data: { videoPurgedAt: new Date() },
      });
      purged++;
    } catch (err) {
      // Leave the row unpurged; the next run retries it.
      errors.push(`${sub.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }
  if (errors.length) console.error("Video purge errors:", errors);

  return NextResponse.json({
    ok: true,
    purged,
    remaining: due.length - purged,
    retentionDays: RETENTION_DAYS,
  });
}
