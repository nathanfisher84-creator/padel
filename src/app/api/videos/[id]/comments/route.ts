import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { redactContact } from "@/lib/redact";

const bodySchema = z.object({
  // Clamp to a sane range: video length is bounded and we never want NaN/∞.
  timeSeconds: z.coerce.number().min(0).max(60 * 60 * 12),
  body: z.string().trim().min(1).max(1000),
});

/**
 * Only the owning coach may annotate, and only while the review is still
 * open. Returns the submission (with feedback) when allowed, otherwise a
 * ready-to-send error response.
 */
async function requireEditableSubmission(id: string) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return {
      error: NextResponse.json(
        { error: "Coach account required." },
        { status: 403 }
      ),
    };
  }
  const submission = await db.videoSubmission.findUnique({
    where: { id },
    include: { feedback: true },
  });
  if (!submission || submission.coachId !== session.id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (submission.feedback) {
    return {
      error: NextResponse.json(
        { error: "This review has been delivered and can no longer be edited." },
        { status: 409 }
      ),
    };
  }
  return { submission };
}

/** Coach pins a timestamped note to the player's uploaded video. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireEditableSubmission(params.id);
  if (gate.error) return gate.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A note (1–1000 chars) and a valid timestamp are required." },
      { status: 400 }
    );
  }

  const comment = await db.feedbackComment.create({
    data: {
      submissionId: gate.submission.id,
      timeSeconds: parsed.data.timeSeconds,
      body: redactContact(parsed.data.body),
    },
  });

  return NextResponse.json({
    comment: {
      id: comment.id,
      timeSeconds: comment.timeSeconds,
      body: comment.body,
    },
  });
}

/** Coach deletes one of their timestamped notes (?commentId=…). */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireEditableSubmission(params.id);
  if (gate.error) return gate.error;

  const commentId = new URL(req.url).searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "Missing commentId." }, { status: 400 });
  }

  // Scope the delete to this submission so a coach can't touch another's notes.
  const result = await db.feedbackComment.deleteMany({
    where: { id: commentId, submissionId: gate.submission.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
