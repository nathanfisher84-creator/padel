import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SubmissionStatus } from "@/lib/constants";
import { deadlineInfo } from "@/lib/deadlines";
import { emailEnabled, notifyCoachReviewReminder } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 100;

/**
 * Turnaround-reminder cron (scheduled via vercel.json). For every open
 * human-coach review it walks the reminder ladder against the coach's
 * committed response time:
 *
 *   stage 0 -> 1  "due soon" email once ~75% of the window has elapsed
 *   stage <2 -> 2 "overdue" email once the deadline has passed
 *
 * The stage is bumped with a guarded updateMany BEFORE sending, so a coach
 * is never emailed twice for the same threshold even if runs overlap. AI
 * submissions are excluded (Nova reviews itself in minutes).
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

  // Without email configured there is nothing useful to do — and skipping
  // keeps the reminder ladder unburnt so coaches still get their nudges
  // once RESEND_API_KEY is added.
  if (!emailEnabled()) {
    return NextResponse.json({ ok: true, skipped: "email disabled" });
  }

  const open = await db.videoSubmission.findMany({
    where: {
      status: SubmissionStatus.AWAITING_FEEDBACK,
      reminderStage: { lt: 2 },
      coach: { coachProfile: { is: { isAi: false } } },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      reminderStage: true,
      player: { select: { name: true } },
      coach: {
        select: {
          email: true,
          name: true,
          coachProfile: { select: { turnaroundHours: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let dueSoonSent = 0;
  let overdueSent = 0;

  for (const sub of open) {
    const turnaround = sub.coach.coachProfile?.turnaroundHours ?? 72;
    const d = deadlineInfo(sub.createdAt, turnaround);

    const target =
      d.state === "overdue" ? 2 : d.state === "soon" ? 1 : null;
    if (target === null || sub.reminderStage >= target) continue;

    // Claim the stage first; count 0 means a concurrent run beat us to it.
    const claimed = await db.videoSubmission.updateMany({
      where: { id: sub.id, reminderStage: { lt: target } },
      data: { reminderStage: target },
    });
    if (claimed.count === 0) continue;

    await notifyCoachReviewReminder({
      coachEmail: sub.coach.email,
      coachName: sub.coach.name,
      playerName: sub.player.name,
      title: sub.title,
      submissionId: sub.id,
      kind: target === 2 ? "overdue" : "due-soon",
      dueAt: d.dueAt,
      hoursLeft: d.hoursLeft,
    });
    if (target === 2) overdueSent++;
    else dueSoonSent++;
  }

  return NextResponse.json({
    ok: true,
    checked: open.length,
    dueSoonSent,
    overdueSent,
  });
}
