import { NextResponse } from "next/server";
import { z } from "zod";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoPaymentsAllowed } from "@/lib/config";
import { Role, FOCUS_SHOTS, playerSideLabel } from "@/lib/constants";
import {
  aiReviewEnabled,
  generateAiPrescan,
  demoAiPrescan,
  type AiPrescan,
} from "@/lib/aiCoach";

// Watching a full match video takes real time — same budget as AI reviews.
export const maxDuration = 300;

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/**
 * Only the owning HUMAN coach may use the pre-scan, and only while their
 * review is still open on an un-purged video.
 */
async function requirePrescanSubmission(id: string) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return {
      error: NextResponse.json({ error: "Coach account required." }, { status: 403 }),
    };
  }
  const submission = await db.videoSubmission.findUnique({
    where: { id },
    include: {
      feedback: true,
      coach: { include: { coachProfile: { select: { isAi: true } } } },
    },
  });
  if (!submission || submission.coachId !== session.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (submission.coach.coachProfile?.isAi) {
    return {
      error: NextResponse.json(
        { error: "The AI coach runs its own analysis." },
        { status: 400 }
      ),
    };
  }
  if (submission.feedback) {
    return {
      error: NextResponse.json(
        { error: "This review has been delivered." },
        { status: 409 }
      ),
    };
  }
  if (submission.videoPurgedAt) {
    return {
      error: NextResponse.json(
        { error: "The video file has been removed." },
        { status: 410 }
      ),
    };
  }
  return { submission };
}

/**
 * Run (or return the stored) AI pre-scan for a submission in the coach's
 * queue: a private inventory, level estimate and draft timestamped notes the
 * coach can accept, edit or dismiss. Idempotent — a stored pre-scan is
 * returned without re-running the model.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requirePrescanSubmission(params.id);
  if (gate.error) return gate.error;
  const submission = gate.submission;

  if (submission.aiPrescan) {
    return NextResponse.json({ prescan: JSON.parse(submission.aiPrescan) });
  }

  const focusShots: string[] = (submission.focusShots?.split(",") ?? [])
    .map((key) => FOCUS_SHOTS.find((s) => s.key === key)?.label)
    .filter((label): label is NonNullable<typeof label> => Boolean(label));

  let prescan: AiPrescan;
  if (aiReviewEnabled()) {
    try {
      const video = submission.videoPath.startsWith("https://")
        ? ({ kind: "url", url: submission.videoPath } as const)
        : ({
            kind: "file",
            path: path.join(uploadDir(), path.basename(submission.videoPath)),
          } as const);
      const generated = await generateAiPrescan({
        video,
        title: submission.title,
        notes: submission.notes,
        focusShots,
        playerOutfit: submission.playerOutfit,
        playerSide: playerSideLabel(submission.playerSide),
      });
      if (!generated) throw new Error("Pre-scan unexpectedly unavailable.");
      prescan = generated;
    } catch (err) {
      console.error("AI pre-scan failed:", err);
      return NextResponse.json(
        { error: "The AI assistant couldn't scan this video. Please try again in a minute." },
        { status: 502 }
      );
    }
  } else if (demoPaymentsAllowed()) {
    prescan = demoAiPrescan();
  } else {
    return NextResponse.json(
      { error: "The AI assistant is not available right now." },
      { status: 503 }
    );
  }

  await db.videoSubmission.update({
    where: { id: submission.id },
    data: { aiPrescan: JSON.stringify(prescan) },
  });
  return NextResponse.json({ prescan });
}

const patchSchema = z.object({ dismissId: z.string().min(1).max(20) });

/** Remove one suggestion from the stored pre-scan (accepted or dismissed). */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requirePrescanSubmission(params.id);
  if (gate.error) return gate.error;
  const submission = gate.submission;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !submission.aiPrescan) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const prescan = JSON.parse(submission.aiPrescan) as AiPrescan;
  prescan.suggestions = prescan.suggestions.filter(
    (s) => s.id !== parsed.data.dismissId
  );
  await db.videoSubmission.update({
    where: { id: submission.id },
    data: { aiPrescan: JSON.stringify(prescan) },
  });
  return NextResponse.json({ prescan });
}
