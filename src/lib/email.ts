/**
 * Transactional email via Resend (https://resend.com) — plain fetch, no SDK.
 *
 * Follows the project's optional-integration pattern: without RESEND_API_KEY
 * the feature is simply off and every helper is a silent no-op. Sending is
 * best-effort — a failed email is logged but NEVER fails the request that
 * triggered it (a lost notification must not lose an upload or a payment).
 *
 * Env:
 *  - RESEND_API_KEY      enables sending
 *  - EMAIL_FROM          from address (default: Resend's shared test sender,
 *                        which works before a domain is verified)
 *  - OWNER_NOTIFY_EMAIL  where owner sale/AI alerts go (falls back to
 *                        ADMIN_EMAIL; owner alerts are off without either)
 */

import { appUrl } from "@/lib/config";
import { turnaroundLabel } from "@/lib/constants";
import { formatDueAt } from "@/lib/deadlines";
import { formatMoney } from "@/lib/format";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "PadelPro <onboarding@resend.dev>";
}

function ownerEmail(): string | null {
  return process.env.OWNER_NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? null;
}

/** Whether owner sale/AI-upload alerts have a destination (for health checks). */
export function ownerAlertsEnabled(): boolean {
  return emailEnabled() && Boolean(ownerEmail());
}

/** Send one email. Never throws; returns whether it was accepted. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error(
        `Email to ${opts.to} rejected (${res.status}):`,
        (await res.text().catch(() => "")).slice(0, 300)
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Email to ${opts.to} failed:`, err);
    return false;
  }
}

/** A human coach has a new video waiting in their review queue. */
export async function notifyCoachNewSubmission(opts: {
  coachEmail: string;
  coachName: string;
  playerName: string;
  title: string;
  submissionId: string;
  /** The coach's committed response time; adds a due-by line when present. */
  turnaroundHours?: number;
  dueAt?: Date;
}): Promise<void> {
  const deadlineLine =
    opts.turnaroundHours && opts.dueAt
      ? [
          `Your committed response time is ${turnaroundLabel(opts.turnaroundHours)} — feedback is due by ${formatDueAt(opts.dueAt)} (Dubai time).`,
          "",
        ]
      : [];
  await sendEmail({
    to: opts.coachEmail,
    subject: `New video to review: "${opts.title}"`,
    text: [
      `Hi ${opts.coachName.split(" ")[0]},`,
      "",
      `${opts.playerName} just uploaded a video for your review: "${opts.title}".`,
      "",
      ...deadlineLine,
      `Watch it and send your feedback here:`,
      `${appUrl()}/submissions/${opts.submissionId}`,
      "",
      "— PadelPro Coaching",
    ].join("\n"),
  });
}

/**
 * Turnaround nudges: "due soon" when ~75% of the coach's committed window has
 * elapsed, "overdue" once the deadline has passed. Sent at most once each by
 * the review-reminders cron (tracked via VideoSubmission.reminderStage).
 */
export async function notifyCoachReviewReminder(opts: {
  coachEmail: string;
  coachName: string;
  playerName: string;
  title: string;
  submissionId: string;
  kind: "due-soon" | "overdue";
  dueAt: Date;
  hoursLeft: number;
}): Promise<void> {
  const first = opts.coachName.split(" ")[0];
  const link = `${appUrl()}/submissions/${opts.submissionId}`;
  const due = `${formatDueAt(opts.dueAt)} (Dubai time)`;
  const isOverdue = opts.kind === "overdue";
  await sendEmail({
    to: opts.coachEmail,
    subject: isOverdue
      ? `Overdue: feedback for "${opts.title}"`
      : `Reminder: "${opts.title}" is due soon`,
    text: [
      `Hi ${first},`,
      "",
      isOverdue
        ? `${opts.playerName}'s video "${opts.title}" is now past your committed response time (it was due by ${due}). Players rate coaches on reliability — please send your feedback as soon as you can.`
        : `${opts.playerName}'s video "${opts.title}" is due by ${due} — about ${Math.max(1, Math.round(opts.hoursLeft))}h from now.`,
      "",
      `Review it here:`,
      link,
      "",
      "— PadelPro Coaching",
    ].join("\n"),
  });
}

/** The player's review is ready (human coach or AI coach). */
export async function notifyPlayerFeedbackDelivered(opts: {
  playerEmail: string;
  playerName: string;
  coachName: string;
  title: string;
  submissionId: string;
  isAi: boolean;
}): Promise<void> {
  await sendEmail({
    to: opts.playerEmail,
    subject: `Your feedback on "${opts.title}" is ready`,
    text: [
      `Hi ${opts.playerName.split(" ")[0]},`,
      "",
      opts.isAi
        ? `The ${opts.coachName} has finished analysing "${opts.title}" — your written feedback and timestamped notes are ready.`
        : `Coach ${opts.coachName} has reviewed "${opts.title}" — your personal feedback is ready.`,
      "",
      `Read it here:`,
      `${appUrl()}/submissions/${opts.submissionId}`,
      "",
      "— PadelPro Coaching",
    ].join("\n"),
  });
}

/** Owner alert: money came in (any coach, both payment kinds). */
export async function notifyOwnerSale(opts: {
  playerName: string;
  coachName: string;
  isAiCoach: boolean;
  kind: "one_off" | "subscription";
  amountCents: number;
  platformFeeCents: number;
  currency: string;
}): Promise<void> {
  const to = ownerEmail();
  if (!to) return;
  const amount = formatMoney(opts.amountCents, opts.currency);
  const platformCut = formatMoney(opts.platformFeeCents, opts.currency);
  await sendEmail({
    to,
    subject: `${opts.isAiCoach ? "AI coach sale" : "New sale"}: ${amount} — ${
      opts.kind === "one_off" ? "one-off review" : "monthly subscription"
    }`,
    text: [
      `${opts.playerName} bought ${
        opts.kind === "one_off" ? "a one-off video review" : "a monthly plan"
      } ${opts.isAiCoach ? `from the ${opts.coachName}` : `with Coach ${opts.coachName}`}.`,
      "",
      `Amount: ${amount}`,
      `Platform share: ${platformCut}`,
      "",
      `Ledger: ${appUrl()}/dashboard`,
    ].join("\n"),
  });
}

/** Owner alert: a player submitted a video to the AI coach. */
export async function notifyOwnerAiUpload(opts: {
  playerName: string;
  title: string;
  submissionId: string;
}): Promise<void> {
  const to = ownerEmail();
  if (!to) return;
  await sendEmail({
    to,
    subject: `AI coach upload: "${opts.title}"`,
    text: [
      `${opts.playerName} uploaded "${opts.title}" to the AI coach — the review is being generated now.`,
      "",
      `View the submission (as admin): ${appUrl()}/submissions/${opts.submissionId}`,
    ].join("\n"),
  });
}
