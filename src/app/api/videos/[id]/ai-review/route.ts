import { NextResponse } from "next/server";
import path from "path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { demoPaymentsAllowed } from "@/lib/config";
import { Role, SubmissionStatus, FOCUS_SHOTS } from "@/lib/constants";
import { redactContact } from "@/lib/redact";
import {
  aiReviewEnabled,
  generateAiReview,
  demoAiReview,
  type AiReviewResult,
} from "@/lib/aiCoach";

// Watching a full match video takes real time: Gemini has to ingest and
// process the file before analysing it. Allow the maximum function duration.
export const maxDuration = 300;

function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

/**
 * Run the AI coach on a submission addressed to the platform's AI coach:
 * generates written feedback plus timestamped notes and delivers them
 * exactly like a human coach's review. Idempotent — a submission that has
 * feedback already (or gains it concurrently) returns ok without rerunning.
 *
 * Triggered by the player from the submission page right after upload.
 */
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
    include: {
      feedback: true,
      coach: { include: { coachProfile: { select: { isAi: true } } } },
    },
  });
  if (
    !submission ||
    (session.id !== submission.playerId && session.role !== Role.ADMIN)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!submission.coach.coachProfile?.isAi) {
    return NextResponse.json(
      { error: "This submission is with a human coach." },
      { status: 400 }
    );
  }
  if (submission.feedback) {
    return NextResponse.json({ ok: true, alreadyReviewed: true });
  }

  const focusShots: string[] = (submission.focusShots?.split(",") ?? [])
    .map((key) => FOCUS_SHOTS.find((s) => s.key === key)?.label)
    .filter((label): label is NonNullable<typeof label> => Boolean(label));

  let result: AiReviewResult;
  if (aiReviewEnabled()) {
    try {
      const video = submission.videoPath.startsWith("https://")
        ? ({ kind: "url", url: submission.videoPath } as const)
        : ({
            kind: "file",
            path: path.join(uploadDir(), path.basename(submission.videoPath)),
          } as const);
      const generated = await generateAiReview({
        video,
        title: submission.title,
        notes: submission.notes,
        focusShots,
      });
      if (!generated) throw new Error("AI review unexpectedly unavailable.");
      result = generated;
    } catch (err) {
      console.error("AI review generation failed:", err);
      return NextResponse.json(
        {
          error:
            "The AI coach couldn't analyse this video. Nothing was used up — please try again in a minute.",
        },
        { status: 502 }
      );
    }
  } else if (demoPaymentsAllowed()) {
    // Local dev / preview without a key: deliver a clearly-labelled sample.
    result = demoAiReview({ title: submission.title, focusShots });
  } else {
    return NextResponse.json(
      { error: "AI reviews are not available right now. Please try again later." },
      { status: 503 }
    );
  }

  try {
    await db.$transaction([
      db.feedback.create({
        data: {
          submissionId: submission.id,
          content: redactContact(result.content),
        },
      }),
      ...(result.comments.length
        ? [
            db.feedbackComment.createMany({
              data: result.comments.map((c) => ({
                submissionId: submission.id,
                timeSeconds: c.timeSeconds,
                body: redactContact(c.body),
              })),
            }),
          ]
        : []),
      db.videoSubmission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.REVIEWED },
      }),
    ]);
  } catch (err) {
    // Unique constraint on Feedback.submissionId: a concurrent run already
    // delivered the review — that's success, not an error.
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyReviewed: true });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
