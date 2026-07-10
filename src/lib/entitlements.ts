import { db } from "@/lib/db";
import {
  PaymentKind,
  PaymentStatus,
  SubscriptionStatus,
} from "@/lib/constants";

export type Entitlement = {
  coachId: string;
  coachName: string;
  /** "credit" = unused one-off review purchase; "subscription" = active plan. */
  source: "credit" | "subscription";
  /** How many more videos the player can submit to this coach right now. */
  remaining: number;
  paymentId?: string;
};

/**
 * Work out which coaches a player can currently submit a video to.
 * One-off payments grant a single review credit each; an active subscription
 * grants up to the coach's monthlyVideoLimit submissions per billing period.
 */
export async function getEntitlements(playerId: string): Promise<Entitlement[]> {
  const entitlements: Entitlement[] = [];

  // Unused one-off credits: PAID one-off payments with no submission attached.
  const credits = await db.payment.findMany({
    where: {
      playerId,
      kind: PaymentKind.ONE_OFF,
      status: PaymentStatus.PAID,
      submission: null,
    },
    include: { coach: true },
    orderBy: { createdAt: "asc" },
  });
  for (const credit of credits) {
    entitlements.push({
      coachId: credit.coachId,
      coachName: credit.coach.name,
      source: "credit",
      remaining: 1,
      paymentId: credit.id,
    });
  }

  // Active subscriptions within the current period.
  const now = new Date();
  const subs = await db.subscription.findMany({
    where: {
      playerId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { gt: now },
    },
    include: { coach: { include: { coachProfile: true } } },
  });
  for (const sub of subs) {
    const limit = sub.coach.coachProfile?.monthlyVideoLimit ?? 4;
    const periodStart = new Date(sub.currentPeriodEnd);
    periodStart.setMonth(periodStart.getMonth() - 1);
    const used = await db.videoSubmission.count({
      where: {
        playerId,
        coachId: sub.coachId,
        paymentId: null, // subscription submissions don't consume credits
        createdAt: { gte: periodStart },
      },
    });
    const remaining = Math.max(0, limit - used);
    if (remaining > 0) {
      entitlements.push({
        coachId: sub.coachId,
        coachName: sub.coach.name,
        source: "subscription",
        remaining,
      });
    }
  }

  return entitlements;
}

/** Find an entitlement usable for a specific coach, credits first. */
export async function getEntitlementForCoach(
  playerId: string,
  coachId: string
): Promise<Entitlement | null> {
  const all = await getEntitlements(playerId);
  return (
    all.find((e) => e.coachId === coachId && e.source === "credit") ??
    all.find((e) => e.coachId === coachId) ??
    null
  );
}
