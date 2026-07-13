import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role, SubmissionStatus } from "@/lib/constants";
import { aiCoachEnabled, analyzeSubmissionVideo } from "@/lib/aiCoach";

// Gemini inline request payloads must stay under ~20MB; base64 inflates bytes
// by ~1/3, so cap the raw clip well below that. Larger clips still get a
// notes-based review (and a nudge toward a human coach). Overridable.
function inlineVideoCap(): number {
  const raw = Number(process.env.AI_VIDEO_MAX_BYTES ?? 14_000_000);
  return Number.isFinite(raw) && raw > 0 ? raw : 14_000_000;
}

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
};

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/** Fetch the clip's bytes if it's within the inline-analysis size cap. */
async function loadVideo(
  videoPath: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    let buf: Buffer;
    let ext: string;
    if (videoPath.startsWith("https://")) {
      const res = await fetch(videoPath);
      if (!res.ok) return null;
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len && len > inlineVideoCap()) return null;
      const arr = Buffer.from(await res.arrayBuffer());
      if (arr.byteLength > inlineVideoCap()) return null;
      buf = arr;
      ext = path.extname(new URL(videoPath).pathname).toLowerCase();
    } else {
      const file = path.join(uploadDir(), path.basename(videoPath));
      buf = await readFile(file);
      if (buf.byteLength > inlineVideoCap()) return null;
      ext = path.extname(file).toLowerCase();
    }
    return { base64: buf.toString("base64"), mimeType: MIME[ext] ?? "video/mp4" };
  } catch {
    return null;
  }
}

/** Generate Nova's instant review for a submission sent to the AI coach. */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
    include: { feedback: true, coach: { include: { coachProfile: true } } },
  });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const allowed =
    session.id === submission.playerId || session.role === Role.ADMIN;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!submission.coach.coachProfile?.isAi) {
    return NextResponse.json(
      { error: "This submission is not with the AI coach." },
      { status: 400 }
    );
  }
  // Idempotent: if Nova already reviewed it, just report success.
  if (submission.feedback) {
    return NextResponse.json({ ok: true, alreadyReviewed: true });
  }
  if (!aiCoachEnabled()) {
    return NextResponse.json(
      { error: "The AI coach is not available right now." },
      { status: 503 }
    );
  }

  try {
    const video = await loadVideo(submission.videoPath);
    const review = await analyzeSubmissionVideo({
      title: submission.title,
      notes: submission.notes,
      focusShots: submission.focusShots,
      video,
    });

    await db.$transaction([
      db.feedback.create({
        data: { submissionId: submission.id, content: review.content },
      }),
      ...review.comments.map((c) =>
        db.feedbackComment.create({
          data: {
            submissionId: submission.id,
            timeSeconds: c.timeSeconds,
            body: c.body,
          },
        })
      ),
      db.videoSubmission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.REVIEWED },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("AI review failed:", err);
    return NextResponse.json(
      { error: "Nova couldn't analyse this clip. Please try again." },
      { status: 502 }
    );
  }
}
