import { db } from "@/lib/db";
import { splitRevenue } from "@/lib/config";
import { notifyOwnerSale } from "@/lib/email";
import {
  PaymentKind,
  PaymentStatus,
  SubscriptionStatus,
} from "@/lib/constants";

/**
 * Compute the revenue split for a coach. The platform's AI coach has no
 * human to pay out, so the platform keeps 100%; everyone else gets the
 * standard PLATFORM_FEE_PERCENT split — unless the coach carries a
 * promotional per-coach rate (founding-coach programme).
 */
async function splitFor(coachId: string, amountCents: number) {
  const profile = await db.coachProfile.findUnique({
    where: { userId: coachId },
    select: { isAi: true, feePercentOverride: true },
  });
  const isAi = Boolean(profile?.isAi);
  if (isAi) {
    return { platformFeeCents: amountCents, coachCents: 0, isAi };
  }
  return { ...splitRevenue(amountCents, profile?.feePercentOverride), isAi };
}

/** Owner sale alert (best-effort — a lost email must not lose a payment). */
async function alertOwner(opts: {
  playerId: string;
  coachId: string;
  isAiCoach: boolean;
  kind: "one_off" | "subscription";
  amountCents: number;
  platformFeeCents: number;
  currency: string;
}) {
  const users = await db.user.findMany({
    where: { id: { in: [opts.playerId, opts.coachId] } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string) =>
    users.find((u) => u.id === id)?.name ?? "Unknown";
  await notifyOwnerSale({
    playerName: nameOf(opts.playerId),
    coachName: nameOf(opts.coachId),
    isAiCoach: opts.isAiCoach,
    kind: opts.kind,
    amountCents: opts.amountCents,
    platformFeeCents: opts.platformFeeCents,
    currency: opts.currency,
  });
}

/**
 * Record a successful one-off review purchase. Creates a PAID payment row
 * carrying the platform/coach revenue split; the payment acts as one video
 * review credit until a submission is attached to it.
 */
export async function recordOneOffPayment(opts: {
  playerId: string;
  coachId: string;
  amountCents: number;
  currency: string;
  stripeRef?: string;
}) {
  // Idempotency: Stripe delivers webhooks at-least-once, so ignore an event
  // we've already fulfilled (same stripeRef) instead of double-crediting.
  if (opts.stripeRef) {
    const existing = await db.payment.findUnique({
      where: { stripeRef: opts.stripeRef },
    });
    if (existing) return existing;
  }
  const { platformFeeCents, coachCents, isAi } = await splitFor(
    opts.coachId,
    opts.amountCents
  );
  const payment = await db.payment.create({
    data: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      kind: PaymentKind.ONE_OFF,
      amountCents: opts.amountCents,
      platformFeeCents,
      coachCents,
      currency: opts.currency,
      status: PaymentStatus.PAID,
      stripeRef: opts.stripeRef,
    },
  });
  await alertOwner({
    playerId: opts.playerId,
    coachId: opts.coachId,
    isAiCoach: isAi,
    kind: "one_off",
    amountCents: opts.amountCents,
    platformFeeCents,
    currency: opts.currency,
  });
  return payment;
}

/**
 * Record a successful monthly subscription payment: upserts the subscription
 * (extending the period by one month) and logs the revenue-split payment.
 */
export async function recordSubscriptionPayment(opts: {
  playerId: string;
  coachId: string;
  amountCents: number;
  currency: string;
  stripeRef?: string;
  stripeSubId?: string;
}) {
  // Idempotency: skip a subscription cycle we've already recorded so a
  // redelivered invoice doesn't extend the period or double-credit.
  if (opts.stripeRef) {
    const existing = await db.payment.findUnique({
      where: { stripeRef: opts.stripeRef },
    });
    if (existing) {
      return db.subscription.findUnique({
        where: {
          playerId_coachId: { playerId: opts.playerId, coachId: opts.coachId },
        },
      });
    }
  }
  const { platformFeeCents, coachCents, isAi } = await splitFor(
    opts.coachId,
    opts.amountCents
  );
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await db.subscription.upsert({
    where: {
      playerId_coachId: { playerId: opts.playerId, coachId: opts.coachId },
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
      stripeSubId: opts.stripeSubId,
    },
    create: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
      stripeSubId: opts.stripeSubId,
    },
  });

  await db.payment.create({
    data: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      kind: PaymentKind.SUBSCRIPTION_CYCLE,
      amountCents: opts.amountCents,
      platformFeeCents,
      coachCents,
      currency: opts.currency,
      status: PaymentStatus.PAID,
      stripeRef: opts.stripeRef,
      subscriptionId: subscription.id,
    },
  });

  await alertOwner({
    playerId: opts.playerId,
    coachId: opts.coachId,
    isAiCoach: isAi,
    kind: "subscription",
    amountCents: opts.amountCents,
    platformFeeCents,
    currency: opts.currency,
  });

  return subscription;
}
