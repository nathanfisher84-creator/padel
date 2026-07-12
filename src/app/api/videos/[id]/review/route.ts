import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role, SubmissionStatus } from "@/lib/constants";
import { redactMaybe } from "@/lib/redact";

const bodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** A player rates a delivered review. One rating per submission; only the
 *  submitting player, only after feedback exists. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== Role.PLAYER) {
    return NextResponse.json({ error: "Player account required." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5." }, { status: 400 });
  }

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
    include: { review: true },
  });
  if (!submission || submission.playerId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.status !== SubmissionStatus.REVIEWED) {
    return NextResponse.json(
      { error: "You can rate once your coach has sent feedback." },
      { status: 400 }
    );
  }
  if (submission.review) {
    return NextResponse.json(
      { error: "You already rated this review." },
      { status: 409 }
    );
  }

  await db.review.create({
    data: {
      submissionId: submission.id,
      playerId: session.id,
      coachId: submission.coachId,
      rating: parsed.data.rating,
      comment: redactMaybe(parsed.data.comment),
    },
  });
  return NextResponse.json({ ok: true });
}
