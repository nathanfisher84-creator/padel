import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role, SubmissionStatus } from "@/lib/constants";

const bodySchema = z.object({
  content: z.string().trim().min(10).max(10000),
});

/** A coach posts feedback on a submission in their review queue. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Feedback must be at least 10 characters." },
      { status: 400 }
    );
  }

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
    include: { feedback: true },
  });
  if (!submission || submission.coachId !== session.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.feedback) {
    return NextResponse.json(
      { error: "Feedback has already been given." },
      { status: 409 }
    );
  }

  await db.$transaction([
    db.feedback.create({
      data: { submissionId: submission.id, content: parsed.data.content },
    }),
    db.videoSubmission.update({
      where: { id: submission.id },
      data: { status: SubmissionStatus.REVIEWED },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
